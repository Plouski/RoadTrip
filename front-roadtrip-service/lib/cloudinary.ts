export async function uploadImageToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
  
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
  
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Cloudinary error response:", errorText);
      throw new Error("Erreur lors de l'upload de l'image.");
    }
  
    const data = await res.json();
    return data.secure_url;
  }
  