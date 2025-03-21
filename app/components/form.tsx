import { useState } from 'react';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pollStatus = async (id: string, folder: string) => {
    let prediction;
    let status;
    while (true) {
      const res = await fetch(`/api/status/${id}`);
      status = res.status;
      if (status === 500) break;
      prediction = await res.json();
      if (["succeeded", "failed", "canceled"].includes(prediction.status)) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (status === 500 || prediction.status === 'failed' || prediction.status === 'canceled') {
        await fetch('/api/cleanup/' + folder, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          });

        setStatus("There was an error while processing your image, please try again in a few minutes");
        await new Promise((r) => setTimeout(r, 1000));
        setUploading(false);
        return null;
    }

    return prediction;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus("Uploading image...");
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    //Upload image to folder
    const uploadRes = await fetch("/api/file", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      setStatus("Image upload failed");
      setUploading(false);
      return;
    }
    const { url, pathname } = await uploadRes.json();
    const folder = pathname.split("/")[1];
    setProgress(25);
    setStatus("Generating description...");

    //Description generation
    const descRes = await fetch("/api/predictions/description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url, folder }),
    });
    const descPrediction = await descRes.json();
    const descResult = await pollStatus(descPrediction.id, folder);
    if (descResult === null) {
        window.location.reload();
        return;
    }
    const description = descResult.output?.join(' ').replace(/\n/g, ' ');
    
    //Description txt file generation
    await fetch("/api/fileGen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `generated/${folder}/description.txt`,
        content: description,
        fileType: "txt",
      }),
    });
    setProgress(50);
    setStatus("Generating image...");

    //Image generation
    const imgRes = await fetch("/api/predictions/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: description, folder }),
    });
    const imgPrediction = await imgRes.json();
    const imgResult = await pollStatus(imgPrediction.id, folder);
    if (imgResult === null) {
        window.location.reload();
        return;
    }
    const imageUrl = imgResult.output[0];

    //Image file generation
    await fetch("/api/fileGen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `generated/${folder}/generated_image.webp`,
        content: imageUrl,
        fileType: "webp",
      }),
    });
    setProgress(75);
    setStatus("Generating audio...");

    //Audio generation
    const speakers = [
        "https://rn2xk7sjthrsbxqc.public.blob.vercel-storage.com/audioBase/matteoAudio-ZRnpUs99H9sI7BurCppQjONxiFLIHp.wav",
        "https://rn2xk7sjthrsbxqc.public.blob.vercel-storage.com/audioBase/cathrineAudio-hS7GFKppvV8zEm92hImJGg7ApTZiaz.wav",
        "https://rn2xk7sjthrsbxqc.public.blob.vercel-storage.com/audioBase/hannaAudio-KumIbXBPkK7Dsl4xYbdXGZUIgH2yVr.wav",
        "https://rn2xk7sjthrsbxqc.public.blob.vercel-storage.com/audioBase/aminaAudio-8fBwV71tY0yKhmKiV7MV4LMkZuHXFe.wav"
    ];
    const speaker = speakers[Math.floor(Math.random() * speakers.length)];

    const audioRes = await fetch("/api/predictions/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: description, speaker, folder }),
    });
    const audioPrediction = await audioRes.json();
    
    const audioResult = await pollStatus(audioPrediction.id, folder);
    if (audioResult === null) {
      window.location.reload();
      return;
    }
    const audioUrl = audioResult.output;

    //Audio file generation
    await fetch("/api/fileGen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `generated/${folder}/generatedAudio.wav`,
        content: audioUrl,
        fileType: "wav",
      }),
    });
    setProgress(100);
    setStatus("All content generated successfully!");
    setUploaded(true);
    setUploading(false);
  };

return (
    <div style={{
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        backgroundColor: 'black',
        color: 'white',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
    }}>
        {!uploading && !uploaded && (
            <form onSubmit={handleSubmit} style={{ width: '90%', maxWidth: '400px' }}>
                <h1>Echoes of Exclusion</h1>
                <p>
                    By sharing your image, you contribute to a collective narrative that evolves throughout the festival. Your uploaded photo, its AI-generated transformation, and descriptive text will be part of this experience.
                </p>
                <label htmlFor="imageInput" style={{
                    display: 'block',
                    width: '60%',
                    padding: '15px',
                    marginTop: '20px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    fontSize: '1.2em',
                    backgroundColor: 'white',
                    color: 'black',
                    border: 'none',
                    textAlign: 'center',
                    cursor: 'pointer',
                    opacity: file ? 1 : 0.5,
                    borderRadius: '5px'
                }}>
                    Choose an Image
                    <input
                        id="imageInput"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const selectedFile = e.target.files?.item(0);
                            setFile(selectedFile || null);
                            if (selectedFile) setFileName(selectedFile.name);
                        }}
                    />
                </label>
                {fileName && (
                    <p style={{ fontSize: '0.9em', marginTop: '15px', color: '#ccc' }}>
                        Selected file: {fileName}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={!file}
                    style={{
                        display: 'block',
                        width: '100%',
                        padding: '15px',
                        marginTop: '20px',
                        fontSize: '1.2em',
                        backgroundColor: 'white',
                        color: 'black',
                        border: 'none',
                        cursor: file ? 'pointer' : 'not-allowed',
                        opacity: file ? 1 : 0.5,
                        borderRadius: '5px'
                    }}
                >
                    Upload Image
                </button>
            </form>
        )}

        {uploading && (
            <div style={{ width: '90%', maxWidth: '400px' }}>
                <h2>Please keep this page open while your image is being processed...</h2>
                <p style={{ fontSize: '0.9em', marginTop: '15px', color: '#ccc' }}>
                    Note that the process will take a few minutes
                </p>
                <div style={{
                    width: '100%',
                    backgroundColor: '#333',
                    height: '20px',
                    marginTop: '20px',
                    borderRadius: '10px'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        backgroundColor: '#4caf50',
                        borderRadius: '10px',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <p style={{ marginTop: '10px' }}>{status}</p>
            </div>
        )}

        {uploaded && (
            <div style={{ width: '90%', maxWidth: '400px' }}>
                <h1>Thank you for contributing!</h1>
                <p>Your image has been successfully uploaded and will soon be displayed in the installation.</p>
                <p style={{ fontSize: '0.9em', marginTop: '15px', color: '#ccc' }}>
                    We encourage mindful participation—each generated image consumes energy, so please share thoughtfully. Your engagement matters.
                </p>
            </div>
        )}
    </div>
  );
}
