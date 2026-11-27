package com.mcclient.launcher;

import android.content.Context;
import android.util.Log;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileWriter;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.util.ArrayDeque;

/**
 * Crash reporting without a PC: saves Java crashes to a file and reads our own
 * app's recent log (which also contains native crashes like "Fatal signal").
 */
final class CrashLog {
    static final String TAG = "MCClient";
    private static File dir;

    private CrashLog() {}

    static void install(Context ctx) {
        dir = ctx.getFilesDir();
        Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
            try (PrintWriter w = new PrintWriter(new FileWriter(new File(dir, "crash.txt")))) {
                w.println("Thread: " + t.getName());
                e.printStackTrace(w);
            } catch (Throwable ignored) {}
            if (prev != null) prev.uncaughtException(t, e);
        });
    }

    /** Log to logcat AND to our own file (Android 13+ may hide logcat from apps). */
    static synchronized void i(String msg) {
        Log.i(TAG, msg);
        if (dir == null) return;
        try (FileWriter w = new FileWriter(new File(dir, "client.log"), true)) {
            w.write(new java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.US)
                    .format(new java.util.Date()) + "  " + msg + "\n");
        } catch (Exception ignored) {}
    }

    /** Saved Java crash (if any) + last warnings/errors from our app's log. */
    static String collect() {
        StringBuilder sb = new StringBuilder();
        sb.append("MC Client ").append(BuildConfig.VERSION_NAME)
          .append(" | Minecraft ").append(GameLoader.mcVersion)
          .append(" | Android ").append(android.os.Build.VERSION.RELEASE)
          .append(" | ").append(android.os.Build.MODEL).append('\n');
        if (GameLoader.error != null) sb.append("Loader error: ").append(GameLoader.error).append('\n');

        File crash = new File(dir, "crash.txt");
        if (crash.exists()) {
            try {
                sb.append("\n=== Java crash ===\n").append(new String(Files.readAllBytes(crash.toPath())));
            } catch (Exception ignored) {}
        }

        File own = new File(dir, "client.log");
        if (own.exists()) {
            try {
                sb.append("\n=== Client log ===\n").append(new String(Files.readAllBytes(own.toPath())));
            } catch (Exception ignored) {}
        }

        sb.append("\n=== System log ===\n");
        try {
            Process p = Runtime.getRuntime().exec(new String[]{"logcat", "-d", "-v", "brief",
                    "-t", "3000", "MCClient:V", "AndroidRuntime:V", "libc:V", "DEBUG:V",
                    "linker:V", "nativeloader:V", "*:W"});
            ArrayDeque<String> last = new ArrayDeque<>();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = r.readLine()) != null) {
                    last.add(line);
                    if (last.size() > 250) last.removeFirst();
                }
            }
            for (String l : last) sb.append(l).append('\n');
        } catch (Exception e) {
            sb.append("Could not read log: ").append(e).append('\n');
        }
        return sb.toString();
    }

    static void clear() {
        new File(dir, "crash.txt").delete();
        new File(dir, "client.log").delete();
        try { Runtime.getRuntime().exec(new String[]{"logcat", "-c"}).waitFor(); } catch (Exception ignored) {}
    }
}
