package com.merchantdad.app;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private View startupView;
    private final Runnable startupTimeout = this::hideStartup;

    private void hideStartup() {
        if (startupView == null) return;
        startupView.removeCallbacks(startupTimeout);
        ViewGroup parent = (ViewGroup) startupView.getParent();
        if (parent != null) parent.removeView(startupView);
        startupView = null;
    }

    @Override
    public void onDestroy() {
        hideStartup();
        super.onDestroy();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);

        if (getBridge() != null) {
            ViewGroup content = findViewById(android.R.id.content);
            startupView = getLayoutInflater().inflate(R.layout.app_startup, content, false);
            content.addView(startupView);
            // Do not leave the loader covering WebView errors on a failed connection.
            startupView.postDelayed(startupTimeout, 30000);
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageCommitVisible(WebView view, String url) {
                    hideStartup();
                }

                @Override
                public void onPageLoaded(WebView webView) {
                    hideStartup();
                }
            });
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
