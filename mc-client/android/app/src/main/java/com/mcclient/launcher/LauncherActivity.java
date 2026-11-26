package com.mcclient.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/** Home screen: status, Play, click GUI test, and the crash log viewer. */
public class LauncherActivity extends Activity {
    private static final String PREFS = "launcher", RUNNING = "game_running";
    private ClickGui testGui;

    /** Called when the game closes normally, so we know the next start isn't after a crash. */
    static void markClosed(Context c) {
        c.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(RUNNING, false).apply();
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        float dp = getResources().getDisplayMetrics().density;
        int pad = (int) (24 * dp);
        boolean crashed = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(RUNNING, false);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("MC Client");
        title.setTextSize(32);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        root.addView(title);

        TextView status = new TextView(this);
        status.setGravity(Gravity.CENTER);
        status.setPadding(0, pad / 2, 0, pad);
        status.setText(GameLoader.ready
                ? "Minecraft " + GameLoader.mcVersion + " found. Ready."
                : GameLoader.error);
        root.addView(status);

        if (crashed) {
            TextView warn = new TextView(this);
            warn.setText("The game closed unexpectedly last time.\nTap \"View crash log\", copy it and send it.");
            warn.setTextColor(0xFFFF6B6B);
            warn.setGravity(Gravity.CENTER);
            warn.setPadding(0, 0, 0, pad / 2);
            root.addView(warn);
        }

        Button play = new Button(this);
        play.setText("Play");
        play.setTextSize(20);
        play.setEnabled(GameLoader.ready);
        play.setOnClickListener(v -> {
            CrashLog.clear();
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(RUNNING, true).commit();
            CrashLog.i("Play pressed");
            // By class name, so this screen never needs Minecraft's classes itself.
            Intent i = new Intent();
            i.setClassName(this, getPackageName() + ".GameActivity");
            startActivity(i);
            finish();
        });
        root.addView(play, new LinearLayout.LayoutParams((int) (220 * dp), (int) (64 * dp)));

        Button menu = new Button(this);
        menu.setText("Test click GUI");
        menu.setOnClickListener(v -> {
            if (testGui == null) {
                testGui = new ClickGui(this);
                testGui.show(getWindow().getDecorView());
            }
        });
        root.addView(menu, buttonParams(dp));

        Button log = new Button(this);
        log.setText(crashed ? "View crash log" : "View log");
        log.setOnClickListener(v -> showLog());
        root.addView(log, buttonParams(dp));

        setContentView(root);
    }

    private static LinearLayout.LayoutParams buttonParams(float dp) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams((int) (220 * dp), (int) (52 * dp));
        lp.topMargin = (int) (12 * dp);
        return lp;
    }

    private void showLog() {
        String text = CrashLog.collect();
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextSize(10);
        tv.setTypeface(Typeface.MONOSPACE);
        tv.setTextIsSelectable(true);
        int p = (int) (12 * getResources().getDisplayMetrics().density);
        tv.setPadding(p, p, p, p);
        ScrollView sv = new ScrollView(this);
        sv.addView(tv);
        new AlertDialog.Builder(this)
                .setTitle("Log")
                .setView(sv)
                .setPositiveButton("Copy", (d, w) -> {
                    ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    cm.setPrimaryClip(ClipData.newPlainText("MC Client log", text));
                    Toast.makeText(this, "Copied. Paste it in the chat.", Toast.LENGTH_LONG).show();
                })
                .setNegativeButton("Close", null)
                .show();
    }

    @Override
    protected void onDestroy() {
        if (testGui != null) testGui.dismiss();
        Native.save();
        super.onDestroy();
    }
}
