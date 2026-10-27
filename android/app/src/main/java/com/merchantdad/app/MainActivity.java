package com.merchantdad.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);

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
                if (webView != null && webView.canGoBack()) {
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
