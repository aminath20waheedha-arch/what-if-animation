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
import java.util.List;
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
}
