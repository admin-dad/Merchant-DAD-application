package com.merchantdad.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Fallback so the loader never blocks the app if the page cannot report ready.
    private static final long LOADER_TIMEOUT_MS = 12000;
    private View appLoader;
    private final Handler loaderHandler = new Handler(Looper.getMainLooper());

    void hideAppLoader() {
        runOnUiThread(() -> {
            loaderHandler.removeCallbacksAndMessages(null);
            View loader = appLoader;
            if (loader == null) return;
            appLoader = null;
            loader.animate().alpha(0f).setDuration(200).withEndAction(() -> {
                if (loader.getParent() instanceof ViewGroup) {
                    ((ViewGroup) loader.getParent()).removeView(loader);
                }
            }).start();
        });
    }

    @Override
    public void onPause() {
        android.webkit.CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FileExportPlugin.class);
        registerPlugin(AppLoaderPlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);

        // Single startup loader (logo + spinner) over the WebView until the website is ready.
        if (savedInstanceState == null) {
            ViewGroup content = findViewById(android.R.id.content);
            appLoader = getLayoutInflater().inflate(R.layout.app_loader, content, false);
            content.addView(appLoader);
            loaderHandler.postDelayed(this::hideAppLoader, LOADER_TIMEOUT_MS);
        }

        // Keep the entire website, including fixed headers, inside the system bars.
        // This activity owns insets; SystemBars insets handling is disabled in config.
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (view, windowInsets) -> {
            Insets safeArea = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
                    | WindowInsetsCompat.Type.ime()
            );
            view.setPadding(safeArea.left, safeArea.top, safeArea.right, safeArea.bottom);
            // Preserve inset dispatch for WebView recalculation, without double padding.
            return new WindowInsetsCompat.Builder(windowInsets)
                .setInsets(
                    WindowInsetsCompat.Type.systemBars()
                        | WindowInsetsCompat.Type.displayCutout()
                        | WindowInsetsCompat.Type.ime(),
                    Insets.NONE
                )
                .build();
        });
        ViewCompat.requestApplyInsets(decor);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                boolean showingOfflinePage = webView != null
                    && getBridge().getErrorUrl() != null
                    && getBridge().getErrorUrl().equals(webView.getUrl());
                // Avoid a back/retry loop between a failed URL and the local fallback.
                if (webView != null && !showingOfflinePage && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // Allow Android's normal root-screen back behavior.
                    setEnabled(false);
                    try {
                        getOnBackPressedDispatcher().onBackPressed();
                    } finally {
                        setEnabled(true);
                    }
                }
            }
        });
    }
}
