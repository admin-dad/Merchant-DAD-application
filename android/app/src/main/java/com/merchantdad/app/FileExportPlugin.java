package com.merchantdad.app;

import android.app.Activity;
import android.content.ContentValues;
import android.os.Build;
import android.provider.MediaStore;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;

@CapacitorPlugin(name = "FileExport")
public class FileExportPlugin extends Plugin {
    private volatile boolean saveInProgress = false;
    private static final int MAX_BYTES = 32 * 1024 * 1024;

    private File prepareFile(PluginCall call) throws IOException {
        String base64 = call.getString("data");
        String name = call.getString("fileName", "download");
        String mime = call.getString("mimeType", "application/octet-stream");
        if (!mime.matches("[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+")) throw new IOException("Invalid file type");
        if (base64 == null || base64.length() > ((long) MAX_BYTES * 4 / 3 + 8)) throw new IOException("File is missing or exceeds 32 MB");
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
        if (bytes.length > MAX_BYTES) throw new IOException("File exceeds 32 MB");
        name = name.replaceAll("[^a-zA-Z0-9._ ()-]", "_");
        if (name.isEmpty() || name.equals(".") || name.equals("..")) name = "download";
        if (name.length() > 160) name = name.substring(name.length() - 160);
        File exports = new File(getContext().getCacheDir(), "file-exports");
        File[] oldDirectories = exports.listFiles();
        long expiry = System.currentTimeMillis() - 24L * 60 * 60 * 1000;
        if (oldDirectories != null) for (File oldDirectory : oldDirectories) {
            if (!oldDirectory.isDirectory() || oldDirectory.lastModified() >= expiry) continue;
            File[] oldFiles = oldDirectory.listFiles();
            if (oldFiles != null) for (File oldFile : oldFiles) oldFile.delete();
            oldDirectory.delete();
        }
        File directory = new File(exports, UUID.randomUUID().toString());
        if (!directory.mkdirs()) throw new IOException("Could not prepare file storage");
        File file = new File(directory, name);
        try (FileOutputStream stream = new FileOutputStream(file)) { stream.write(bytes); }
        // Keep large Base64 data out of the activity result's saved state.
        call.getData().remove("data");
        call.getData().put("_exportPath", file.getAbsolutePath());
        call.getData().put("fileName", name);
        call.getData().put("mimeType", mime);
        return file;
    }

    private File preparedFile(PluginCall call) throws IOException {
        String path = call.getString("_exportPath");
        if (path == null) throw new IOException("Prepared file is missing");
        File file = new File(path);
        String root = new File(getContext().getCacheDir(), "file-exports").getCanonicalPath() + File.separator;
        if (!file.getCanonicalPath().startsWith(root) || !file.isFile()) throw new IOException("Invalid prepared file");
        return file;
    }

    private void removeFile(File file) {
        if (file != null) {
            File directory = file.getParentFile();
            file.delete();
            if (directory != null) directory.delete();
        }
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        if (saveInProgress) { call.reject("Finish the current save dialog first", "SAVE_BUSY"); return; }
        saveInProgress = true;
        final File file;
        try { file = prepareFile(call); }
        catch (Exception error) { saveInProgress = false; call.reject("Could not prepare download: " + error.getMessage(), error); return; }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && call.getString("mimeType", "").startsWith("image/")) {
            Uri destination = null;
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, file.getName());
                values.put(MediaStore.Images.Media.MIME_TYPE, call.getString("mimeType"));
                values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Merchant DAD");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                destination = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (destination == null) throw new IOException("Could not create gallery image");
                try (FileInputStream input = new FileInputStream(file);
                     OutputStream output = getContext().getContentResolver().openOutputStream(destination)) {
                    if (output == null) throw new IOException("Could not save gallery image");
                    byte[] buffer = new byte[65536];
                    int length;
                    while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
                }
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                getContext().getContentResolver().update(destination, values, null, null);
                JSObject response = new JSObject();
                response.put("cancelled", false);
                response.put("fileName", file.getName());
                call.resolve(response);
            } catch (Exception error) {
                if (destination != null) getContext().getContentResolver().delete(destination, null, null);
                call.reject("Could not save image to gallery", error);
            } finally { removeFile(file); saveInProgress = false; }
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(call.getString("mimeType", "application/octet-stream"));
                intent.putExtra(Intent.EXTRA_TITLE, file.getName());
                startActivityForResult(call, intent, "fileSaved");
            } catch (Exception error) {
                saveInProgress = false;
                removeFile(file);
                call.reject("Could not open the Android save dialog", error);
            }
        });
    }

    @ActivityCallback
    private void fileSaved(PluginCall call, ActivityResult result) {
        if (call == null) { saveInProgress = false; return; }
        getBridge().execute(() -> {
            File file = null;
            try {
                file = preparedFile(call);
                if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
                    JSObject response = new JSObject();
                    response.put("cancelled", true);
                    call.resolve(response);
                    return;
                }
                Uri destination = result.getData().getData();
                try (FileInputStream input = new FileInputStream(file);
                     OutputStream output = getContext().getContentResolver().openOutputStream(destination, "w")) {
                    if (output == null) throw new IOException("The selected destination cannot be written");
                    byte[] buffer = new byte[64 * 1024];
                    int length;
                    while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
                    output.flush();
                }
                JSObject response = new JSObject();
                response.put("cancelled", false);
                response.put("fileName", file.getName());
                call.resolve(response);
            } catch (Exception error) {
                call.reject("Could not save the file. Choose another folder and try again.", error);
            } finally {
                removeFile(file);
                saveInProgress = false;
            }
        });
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        final File file;
        try { file = prepareFile(call); }
        catch (Exception error) { call.reject("Could not prepare image for sharing", error); return; }
        getActivity().runOnUiThread(() -> {
            try {
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType(call.getString("mimeType", "application/octet-stream"));
                share.putExtra(Intent.EXTRA_STREAM, uri);
                share.putExtra(Intent.EXTRA_TITLE, call.getString("title", file.getName()));
                share.setClipData(ClipData.newRawUri(file.getName(), uri));
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(share, "Share file");
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(chooser);
                // The receiving app may read later; retain the file in Android's cache.
                call.resolve();
            } catch (Exception error) {
                removeFile(file);
                call.reject("Could not open Android sharing", error);
            }
        });
    }

    @PluginMethod
    public void openRakvih(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://rakvih.in/"));
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setPackage("com.android.chrome");
                try { getActivity().startActivity(intent); }
                catch (android.content.ActivityNotFoundException unavailable) {
                    intent.setPackage(null);
                    getActivity().startActivity(intent);
                }
                call.resolve();
            } catch (Exception error) { call.reject("Could not open your browser", error); }
        });
    }

    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) { call.reject("Nothing to share"); return; }
        getActivity().runOnUiThread(() -> {
            try {
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("text/plain");
                share.putExtra(Intent.EXTRA_TEXT, text);
                share.putExtra(Intent.EXTRA_TITLE, call.getString("title", "Merchant DAD"));
                getActivity().startActivity(Intent.createChooser(share, "Share"));
                call.resolve();
            } catch (Exception error) { call.reject("Could not open Android sharing", error); }
        });
    }
}
