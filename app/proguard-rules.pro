# The web UI calls window.AndroidBridge.saveCsv(...) by name from JavaScript. R8 cannot see that
# call, so with minifyEnabled it would rename or remove the method and CSV export would break.
# These rules keep every @JavascriptInterface method.
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

