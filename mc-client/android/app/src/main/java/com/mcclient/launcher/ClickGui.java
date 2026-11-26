package com.mcclient.launcher;

import android.app.Activity;
import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.ContextThemeWrapper;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Click GUI: a draggable floating button that opens a module panel. The panel is
 * generated from the native module list, so every setting a module declares
 * appears here automatically. Built in code (no XML) so it also works inside the
 * game, where the app's resources are swapped for Minecraft's.
 */
final class ClickGui {
    private static final int BG = 0xF0141619, CARD = 0xFF1F232A, ACCENT = 0xFF4F8CFF,
            TEXT = 0xFFECEEF2, SUB = 0xFF9AA0AA, TRACK = 0xFF2C313A;

    private final Activity act;
    private final Context ctx;
    private final float dp;
    private View anchor;
    private PopupWindow fab, panel;
    private int fabX, fabY;

    ClickGui(Activity a) {
        act = a;
        ctx = new ContextThemeWrapper(a, android.R.style.Theme_DeviceDefault);
        dp = a.getResources().getDisplayMetrics().density;
    }

    private int px(float v) { return Math.round(v * dp); }

    void show(View anchorView) {
        anchor = anchorView;
        anchor.post(this::showFab);
    }

    void dismiss() {
        if (panel != null) panel.dismiss();
        if (fab != null) fab.dismiss();
    }

    private static GradientDrawable round(int color, float radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radius);
        return d;
    }

    private TextView text(String s, float size, int color, boolean bold) {
        TextView t = new TextView(ctx);
        t.setText(s);
        t.setTextSize(size);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    // ---- Floating button ---------------------------------------------------

    private void showFab() {
        if (act.isFinishing()) return;
        TextView b = text("☰", 22, TEXT, true);
        b.setGravity(Gravity.CENTER);
        b.setBackground(round(ACCENT, px(26)));
        int size = px(52);
        fab = new PopupWindow(b, size, size, false);
        fab.setClippingEnabled(false);
        fabX = px(16);
        fabY = px(90);
        fab.showAtLocation(anchor, Gravity.TOP | Gravity.START, fabX, fabY);

        b.setOnTouchListener(new View.OnTouchListener() {
            float sx, sy;
            int ox, oy;
            boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        sx = e.getRawX(); sy = e.getRawY(); ox = fabX; oy = fabY; moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (e.getRawX() - sx), dy = (int) (e.getRawY() - sy);
                        if (Math.abs(dx) + Math.abs(dy) > px(8)) moved = true;
                        if (moved) {
                            fabX = ox + dx; fabY = oy + dy;
                            fab.update(fabX, fabY, -1, -1);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) togglePanel();
                        return true;
                }
                return false;
            }
        });
    }

    // ---- Panel -------------------------------------------------------------

    private void togglePanel() {
        if (panel != null && panel.isShowing()) closePanel();
        else openPanel();
    }

    private void closePanel() {
        if (panel != null) panel.dismiss();
        Native.save();
    }

    private void openPanel() {
        int sw = act.getResources().getDisplayMetrics().widthPixels;
        int sh = act.getResources().getDisplayMetrics().heightPixels;
        int w = Math.min(px(400), (int) (sw * 0.85f));
        int h = (int) (sh * 0.85f);

        LinearLayout root = new LinearLayout(ctx);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackground(round(BG, px(16)));
        root.setPadding(px(14), px(12), px(14), px(12));

        LinearLayout header = new LinearLayout(ctx);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = text("MC Client", 20, TEXT, true);
        header.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        TextView close = text("✕", 20, SUB, false);
        close.setPadding(px(12), px(4), px(4), px(4));
        close.setOnClickListener(v -> closePanel());
        header.addView(close);
        root.addView(header);

        ScrollView scroll = new ScrollView(ctx);
        LinearLayout list = new LinearLayout(ctx);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(0, px(10), 0, 0);
        scroll.addView(list);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        try {
            JSONArray mods = new JSONObject(Native.modulesJson()).getJSONArray("modules");
            for (int i = 0; i < mods.length(); i++) addModule(list, mods.getJSONObject(i));
        } catch (Exception e) {
            list.addView(text("Could not load modules: " + e, 14, SUB, false));
        }

        panel = new PopupWindow(root, w, h, false);
        panel.setClippingEnabled(true);
        panel.showAtLocation(anchor, Gravity.CENTER, 0, 0);
    }

    private void addModule(LinearLayout list, JSONObject m) throws Exception {
        String name = m.getString("name");

        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackground(round(CARD, px(12)));
        card.setPadding(px(12), px(10), px(12), px(10));
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(-1, -2);
        clp.bottomMargin = px(10);
        list.addView(card, clp);

        LinearLayout row = new LinearLayout(ctx);
        row.setGravity(Gravity.CENTER_VERTICAL);
        TextView label = text("▸  " + name, 17, TEXT, true);
        row.addView(label, new LinearLayout.LayoutParams(0, -2, 1));
        Switch toggle = new Switch(ctx);
        toggle.setChecked(m.getBoolean("enabled"));
        toggle.setOnCheckedChangeListener((b, on) -> Native.setEnabled(name, on));
        row.addView(toggle);
        card.addView(row);

        card.addView(text(m.optString("desc"), 13, SUB, false));

        LinearLayout settings = new LinearLayout(ctx);
        settings.setOrientation(LinearLayout.VERTICAL);
        settings.setVisibility(View.GONE);
        settings.setPadding(0, px(8), 0, 0);
        card.addView(settings);

        JSONArray ss = m.getJSONArray("settings");
        for (int i = 0; i < ss.length(); i++) addSetting(settings, name, ss.getJSONObject(i));

        label.setOnClickListener(v -> {
            boolean open = settings.getVisibility() != View.VISIBLE;
            settings.setVisibility(open ? View.VISIBLE : View.GONE);
            label.setText((open ? "▾  " : "▸  ") + name);
        });
    }

    private void addSetting(LinearLayout box, String mod, JSONObject s) throws Exception {
        String id = s.getString("id"), lbl = s.getString("label"), type = s.getString("type");
        float value = (float) s.getDouble("value"), min = (float) s.getDouble("min"),
                max = (float) s.getDouble("max"), step = (float) s.getDouble("step");
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = px(8);

        switch (type) {
            case "bool": {
                Switch sw = new Switch(ctx);
                sw.setText(lbl);
                sw.setTextColor(TEXT);
                sw.setChecked(value >= 0.5f);
                sw.setOnCheckedChangeListener((b, on) -> Native.setSetting(mod, id, on ? 1 : 0));
                box.addView(sw, lp);
                break;
            }
            case "choice": {
                JSONArray ch = s.getJSONArray("choices");
                String[] opts = new String[ch.length()];
                for (int i = 0; i < opts.length; i++) opts[i] = ch.getString(i);
                final int[] idx = {Math.max(0, Math.min(opts.length - 1, Math.round(value)))};
                TextView btn = text(lbl + ":  " + opts[idx[0]], 15, TEXT, false);
                btn.setBackground(round(TRACK, px(8)));
                btn.setPadding(px(10), px(8), px(10), px(8));
                btn.setOnClickListener(v -> {
                    idx[0] = (idx[0] + 1) % opts.length;
                    btn.setText(lbl + ":  " + opts[idx[0]]);
                    Native.setSetting(mod, id, idx[0]);
                });
                box.addView(btn, lp);
                break;
            }
            default: { // float / int slider
                boolean isInt = type.equals("int");
                TextView t = text(lbl + ":  " + fmt(value, isInt), 15, TEXT, false);
                box.addView(t, lp);
                SeekBar bar = new SeekBar(ctx);
                int steps = Math.max(1, Math.round((max - min) / step));
                bar.setMax(steps);
                bar.setProgress(Math.round((value - min) / step));
                bar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                    @Override public void onProgressChanged(SeekBar sb, int p, boolean user) {
                        float v = Math.min(max, min + p * step);
                        if (isInt) v = Math.round(v);
                        t.setText(lbl + ":  " + fmt(v, isInt));
                        if (user) Native.setSetting(mod, id, v);
                    }
                    @Override public void onStartTrackingTouch(SeekBar sb) {}
                    @Override public void onStopTrackingTouch(SeekBar sb) {}
                });
                box.addView(bar, new LinearLayout.LayoutParams(-1, -2));
            }
        }
    }

    private static String fmt(float v, boolean isInt) {
        return isInt ? String.valueOf(Math.round(v)) : String.format(Locale.US, "%.2f", v);
    }
}
