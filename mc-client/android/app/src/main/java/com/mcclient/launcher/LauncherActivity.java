package com.mcclient.launcher;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Home screen: status + Play. */
public class LauncherActivity extends Activity {
    private ClickGui testGui;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        float dp = getResources().getDisplayMetrics().density;
        int pad = (int) (24 * dp);

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

        Button play = new Button(this);
        play.setText("Play");
        play.setTextSize(20);
        play.setEnabled(GameLoader.ready);
        play.setOnClickListener(v -> {
            // By class name, so this screen never needs Minecraft's classes itself.
            Intent i = new Intent();
            i.setClassName(this, getPackageName() + ".GameActivity");
            startActivity(i);
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
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams((int) (220 * dp), (int) (52 * dp));
        lp.topMargin = (int) (12 * dp);
        root.addView(menu, lp);

        setContentView(root);
    }

    @Override
    protected void onDestroy() {
        if (testGui != null) testGui.dismiss();
        Native.save();
        super.onDestroy();
    }
}
