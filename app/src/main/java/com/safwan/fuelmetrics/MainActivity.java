package com.safwan.fuelmetrics;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.ComponentActivity;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.SystemBarStyle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Hosts the bundled web app (assets/index.html) in a WebView. Data lives in the WebView's localStorage. */
public class MainActivity extends ComponentActivity {

    private static final String START_URL = "file:///android_asset/index.html";

    // CSV waiting for the system "save as" dialog. Kept in a cache file (not a field) so it survives
    // the process being killed while that dialog is open.
    private static final String PENDING_CSV = "pending_export.csv";

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    // CSV import: system file picker requested by <input type="file">.
    private final ActivityResultLauncher<Intent> chooser = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(
                            WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData()));
                    fileCallback = null;
                }
            });

    // CSV export: system "save as" dialog.
    private final ActivityResultLauncher<String> saver = registerForActivityResult(
            new ActivityResultContracts.CreateDocument("text/csv"), uri -> {
                byte[] data = readPendingCsv();
                pendingCsvFile().delete();
                if (uri == null) return; // user cancelled
                boolean ok = false;
                if (data != null) {
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                        if (os != null) {
                            os.write(data);
                            ok = true;
                        }
                    } catch (Exception ignored) { }
                }
                if (!ok) {
                    // The picker has already created an empty file; don't leave it behind.
                    try { DocumentsContract.deleteDocument(getContentResolver(), uri); } catch (Exception ignored) { }
                }
                js(ok ? "A.exported()" : "toast(\"Couldn't save the CSV file\")");
            });

    private File pendingCsvFile() {
        return new File(getCacheDir(), PENDING_CSV);
    }

    private byte[] readPendingCsv() {
        File f = pendingCsvFile();
        if (!f.isFile()) return null;
        try (FileInputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } catch (IOException e) {
            return null;
        }
    }

    /** Exposed to JS as window.AndroidBridge. */
    private class Bridge {
        @JavascriptInterface
        public void saveCsv(String name, String csv) {
            if (name == null || csv == null) return;
            runOnUiThread(() -> {
                try (FileOutputStream out = new FileOutputStream(pendingCsvFile())) {
                    out.write(csv.getBytes(StandardCharsets.UTF_8));
                } catch (IOException e) {
                    js("toast(\"Couldn't save the CSV file\")");
                    return;
                }
                try {
                    saver.launch(name);
                } catch (ActivityNotFoundException e) { // no document picker on this device
                    pendingCsvFile().delete();
                    js("toast(\"No file manager available to save the CSV\")");
                }
            });
        }
    }

    private void js(String code) {
        if (web != null) web.evaluateJavascript(code, null);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Always dark status/nav icons: the app UI is light.
        EdgeToEdge.enable(this,
                SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
                SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT));
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFFF2F4F8);
        web = new WebView(this);
        web.setBackgroundColor(0xFFF2F4F8);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Keep web content clear of the status bar, gesture bar and keyboard.
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets i = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime());
            v.setPadding(i.left, i.top, i.right, i.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);   // localStorage = where the fuel log is saved
        s.setAllowFileAccess(false);    // file:///android_asset stays available regardless
        s.setAllowContentAccess(true);  // needed to read the CSV picked via the file chooser
        s.setSupportZoom(false);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Never navigate away from the bundled app.
                return !request.getUrl().toString().startsWith("file:///android_asset/");
            }

            // The renderer was killed (normally low memory). Without this override the whole app dies.
            // All data is in localStorage, so rebuilding the activity with a fresh WebView loses nothing.
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (detail.didCrash()) return false; // a real renderer crash: don't mask it
                recreate();
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    chooser.launch(params.createIntent());
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        // Back: the web app closes the open sheet/dialog, else returns to Home; otherwise we leave the app.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (web == null) {
                    finish();
                    return;
                }
                web.evaluateJavascript(
                        "(function(){try{return window.handleBack?window.handleBack():false}catch(e){return false}})()",
                        value -> { if (!"true".equals(value)) finish(); });
            }
        });

        // No saved state, or it can't be restored: load the app normally (avoids a blank screen).
        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) web.loadUrl(START_URL);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            ((ViewGroup) web.getParent()).removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
