import { useState } from 'react';

const installationOnline = (process.env.NEXT_PUBLIC_INSTALLATION_ONLINE ?? "false") === "true";

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
        {!installationOnline && (
            <div style={{ width: '90%', maxWidth: '400px' }}>
                <h1>Echoes of Exclusion is actually offline.<br/>Echoes of Exclusion è attualmente offline.</h1>
                <p>The last installation ended. If you are interested in showing the installation in your spaces please contact the authors via the <a style={{ color: 'white' }} href='https://github.com/zumatt/maind-echoes-of-exclusion/discussions'>GitHub repository</a></p>
                <p>L'ultima installazione è terminata. Se siete interessati a mostrare l'installazione nei vostri spazi, contattate gli autori tramite il <a style={{ color: 'white' }} href='https://github.com/zumatt/maind-echoes-of-exclusion/discussions'>repository Github</a></p>
            </div>
        )}
        {installationOnline && !uploading && !uploaded && (
            <form onSubmit={handleSubmit} style={{ width: '90%', maxWidth: '400px' }}>
                <h1>Echoes of Exclusion</h1>
                <p>By sharing your image, you contribute to a collective narrative that evolves throughout the exposition. Your uploaded photo, its AI-generated transformation, and descriptive text will be part of this experience. Please be aware that the images you upload will be analysed by AI models, be sure you have rights to use the image and that it does not contains any personal or sensible data.</p>
                <p>Condividendo la tua immagine, contribuisci a una narrazione collettiva che si evolve nel corso dell'esposizione. La foto che hai caricato, la sua trasformazione generata dall'intelligenza artificiale e il testo descrittivo faranno parte di questa esperienza. Ti preghiamo di tenere presente che le immagini che carichi saranno analizzate da modelli di intelligenza artificiale, assicurati di avere i diritti per utilizzare l'immagine e che questa non contenga dati personali o sensibili.</p>
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
                    Choose an Image / Scegli un'immagine
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
                        Selected file / File selezionato: {fileName}
                    </p>
                )}
                {file && (
                  <button
                    type="submit"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '15px',
                      marginTop: '20px',
                      fontSize: '1.2em',
                      backgroundColor: 'white',
                      color: 'black',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '5px'
                    }}
                  >
                    Upload Image / Carica immagine
                  </button>
                )}
            </form>
        )}

        {installationOnline && uploading && (
            <div style={{ width: '90%', maxWidth: '400px' }}>
                <h2>Please keep this page open while your image is being processed...<br/>Mantieni aperta questa pagina mentre l'immagine viene elaborata...</h2>
                <p style={{ fontSize: '0.9em', marginTop: '15px', color: '#ccc' }}>
                    Note that the process will take a few minutes<br/>Questo processo richiederà alcuni minuti.
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

        {installationOnline && uploaded && (
            <div style={{ width: '90%', maxWidth: '400px' }}>
                <h1>Thank you for contributing!<br/>Grazie per il tuo contributo!</h1>
                <p>Your image has been successfully uploaded and will soon be displayed in the installation.<br/>While you are waiting, you can explore the <a style={{ color: 'white' }} href="https://maind.supsi.ch/">website of the Master of Arts in Interaction Design SUPSI</a>.</p>
                <p>L'immagine è stata caricata correttamente e verrà presto visualizzata nell'installazione.<br/>Mentre aspetti, puoi esplorare il <a style={{ color: 'white' }}  href="https://maind.supsi.ch">sito web del Master of Arts in Interaction Design SUPSI</a>.</p>
                <p style={{ fontSize: '0.9em', marginTop: '15px', color: '#ccc' }}>
                Please be aware that every generation consumes energy, so please use this tool responsibly.<br/>Si prega di tenere presente che ogni generazione consuma energia, quindi si prega di utilizzare questo strumento in modo responsabile.
                </p>
            </div>
        )}
    </div>
  );
}
