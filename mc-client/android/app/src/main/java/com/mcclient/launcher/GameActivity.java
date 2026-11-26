package com.mcclient.launcher;

import android.content.res.AssetManager;
import android.content.res.Resources;
import android.os.Bundle;
import android.widget.Toast;

/**
 * Minecraft's own activity, running inside our app. We only swap in the game's
 * resources/assets and add our click GUI on top.
 */
public class GameActivity extends com.mojang.minecraftpe.MainActivity {
    private ClickGui gui;

    @Override
    public Resources getResources() {
        return GameLoader.mcResources != null ? GameLoader.mcResources : super.getResources();
    }

    @Override
    public AssetManager getAssets() {
        return GameLoader.mcResources != null ? GameLoader.mcResources.getAssets() : super.getAssets();
    }

    @Override
    protected void onCreate(Bundle state) {
        CrashLog.i("GameActivity.onCreate: starting Minecraft");
        super.onCreate(state);
        CrashLog.i("GameActivity.onCreate: Minecraft started");
        Toast.makeText(this, Native.gameStatus(), Toast.LENGTH_LONG).show();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && gui == null) {
            gui = new ClickGui(this);
            gui.show(getWindow().getDecorView());
        }
    }

    @Override
    protected void onPause() {
        Native.save();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        CrashLog.i("GameActivity.onDestroy");
        LauncherActivity.markClosed(this);
        if (gui != null) gui.dismiss();
        super.onDestroy();
    }
}
