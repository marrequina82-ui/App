import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export interface PickedImage { uri: string; base64: string }

/**
 * Take a photo (or pick from gallery), then shrink it to ~1024 px JPEG so the upload
 * is small and fast. Returns null if the user cancels or denies permission.
 */
export async function getPhoto(source: "camera" | "library"): Promise<PickedImage | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Camera permission is needed to scan food.");
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error("Photo library permission is needed to pick a photo.");
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.9 };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return shrinkPhoto(asset.uri, asset.width ?? 0, asset.height ?? 0);
}

/** Pick or take a square profile photo and return it as a small JPEG data URL. Null if cancelled. */
export async function pickAvatarPhoto(source: "camera" | "library"): Promise<string | null> {
  const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === "camera" ? "Camera permission is needed to take a photo." : "Photo library permission is needed to pick a photo.");
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9 };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const context = ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: 256 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error("Couldn't read the photo.");
  return `data:image/jpeg;base64,${saved.base64}`;
}

export async function shrinkPhoto(uri: string, width: number, height: number): Promise<PickedImage> {
  const context = ImageManipulator.manipulate(uri);
  // Pass only the side we're fixing. On web, a null side becomes a zero-size canvas
  // and crashes createImageData, so the other side must be left out, not set to null.
  if (width >= height) context.resize({ width: 1024 });
  else context.resize({ height: 1024 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  if (!saved.base64) throw new Error("Couldn't read the photo.");
  return { uri: saved.uri, base64: saved.base64 };
}
