package com.mcclient.launcher;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.os.Build;
import android.os.Process;
import java.io.File;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import dalvik.system.BaseDexClassLoader;

/**
 * Loads the installed Minecraft into OUR process instead of launching the
 * original app. The game then runs as part of our app (own data, own worlds),
 * so the normal Minecraft stays untouched and both can be installed.
 */
final class GameLoader {
    static final String MC_PACKAGE = "com.mojang.minecraftpe";
    static final String MC_ACTIVITY = "com.mojang.minecraftpe.MainActivity";

    static ApplicationInfo mcInfo;
    static Resources mcResources;
    static String mcVersion = "?";
    static String error;
    static boolean ready;
    private static final List<String> libFiles = new ArrayList<>();
    private static boolean preloaded;

    private GameLoader() {}

    static void inject(Context ctx) {
        PackageManager pm = ctx.getPackageManager();
        try {
            mcInfo = pm.getApplicationInfo(MC_PACKAGE, 0);
            mcVersion = pm.getPackageInfo(MC_PACKAGE, 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            error = "Minecraft is not installed. Install it from the Play Store first.";
            return;
        }
        try {
            ClassLoader cl = GameLoader.class.getClassLoader();

            // 1) Minecraft's Java code (all APK parts).
            List<String> apks = new ArrayList<>();
            apks.add(mcInfo.sourceDir);
            if (mcInfo.splitSourceDirs != null) Collections.addAll(apks, mcInfo.splitSourceDirs);
            Method addDex = BaseDexClassLoader.class.getDeclaredMethod("addDexPath", String.class);
            addDex.setAccessible(true);
            addDex.invoke(cl, String.join(File.pathSeparator, apks));

            // 2) Minecraft's native libraries (extracted folder, or inside the APKs).
            String abi = Process.is64Bit() ? Build.SUPPORTED_64_BIT_ABIS[0] : Build.SUPPORTED_32_BIT_ABIS[0];
            List<String> libs = new ArrayList<>();
            if (mcInfo.nativeLibraryDir != null && new File(mcInfo.nativeLibraryDir, "libminecraftpe.so").exists())
                libs.add(mcInfo.nativeLibraryDir);
            for (String apk : apks) libs.add(apk + "!/lib/" + abi);
            findLibFiles(apks, abi);
            Method addNative = BaseDexClassLoader.class.getDeclaredMethod("addNativePath", Collection.class);
            addNative.setAccessible(true);
            addNative.invoke(cl, libs);

            // 3) Check the game's activity class is now reachable.
            Class.forName(MC_ACTIVITY, false, cl);

            // 4) Minecraft's resources and assets (textures, UI, sounds).
            mcResources = pm.getResourcesForApplication(mcInfo);
            ready = true;
        } catch (Throwable t) {
            Throwable c = t.getCause() != null ? t.getCause() : t;
            error = "Could not load Minecraft: " + c;
        }
    }

    /** Every .so Minecraft ships, as full paths (extracted folder, or inside the APKs). */
    private static void findLibFiles(List<String> apks, String abi) {
        File dir = mcInfo.nativeLibraryDir != null ? new File(mcInfo.nativeLibraryDir) : null;
        if (dir != null && new File(dir, "libminecraftpe.so").exists()) {
            File[] fs = dir.listFiles((d, n) -> n.endsWith(".so"));
            if (fs != null) for (File f : fs) libFiles.add(f.getPath());
            return;
        }
        String prefix = "lib/" + abi + "/";
        for (String apk : apks) {
            try (ZipFile z = new ZipFile(apk)) {
                Enumeration<? extends ZipEntry> en = z.entries();
                while (en.hasMoreElements()) {
                    String n = en.nextElement().getName();
                    if (n.startsWith(prefix) && n.endsWith(".so")) libFiles.add(apk + "!/" + n);
                }
            } catch (Exception ignored) {}
        }
    }

    /**
     * Load Minecraft's helper libraries by full path BEFORE the game starts.
     * Android only searches our app's own lib folder for a library's dependencies,
     * so libminecraftpe.so could not find e.g. libpairipcore.so on its own.
     * Libraries are retried in passes until their own dependencies are loaded.
     */
    static void preloadLibraries() {
        if (preloaded || !ready) return;
        preloaded = true;
        List<String> pending = new ArrayList<>();
        for (String f : libFiles) if (!f.endsWith("/libminecraftpe.so")) pending.add(f);
        CrashLog.i("preloading " + pending.size() + " Minecraft libs: " + pending);
        boolean progress = true;
        while (!pending.isEmpty() && progress) {
            progress = false;
            for (int i = 0; i < pending.size(); ) {
                try {
                    System.load(pending.get(i));
                    CrashLog.i("loaded " + pending.get(i));
                    pending.remove(i);
                    progress = true;
                } catch (Throwable t) {
                    i++;
                }
            }
        }
        for (String f : pending) {
            try { System.load(f); } catch (Throwable t) { CrashLog.i("could not load " + f + ": " + t.getMessage()); }
        }
    }
}
