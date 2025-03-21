import { useState } from "react";
import Replicate from "replicate";



export default function UploadForm() {
    const [file, setFile] = useState<File | null>(null);
    const [uploaded, setUploaded] = useState(false);
    const [fileName, setFileName] = useState("");
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setStatus("Uploading...");
        setProgress(20); // Fake initial progress

        const formData = new FormData();
        formData.append("file", file);

        let filePath;
        let originalImagePath;
        let imageDescription;

        //Image upload
        try {
            const response = await fetch("/api/file", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert("The system supports only image uploads: jpg, png, gif");
                console.error(errorData.error);
                setUploading(false);
                return;
            }

            const jsonResponse = await response.json();
            originalImagePath = jsonResponse.url;
            const completePath = jsonResponse.pathname;
            filePath = completePath.split("/");
            filePath = filePath[1];

            console.log(filePath);

            setProgress(40);
            setStatus("Image correctly uploaded!");
            
            setTimeout(() => {
                setUploading(false);
                setUploaded(true);
            }, 1000);
        } catch (error) {
            setStatus("Upload failed. Please try again.");
            console.error(error);
            setUploading(false);
            return;
        }

        //Text description generation
        try {
            if (!process.env.REPLICATE_API_TOKEN) {
                setStatus('Missing API token. Please check your environment variables.');
                console.error('Missing API token');
                setUploading(false);
                return;
            }

            //REPLICATE API
            const input = { image: originalImagePath, prompt: "Describe this image with a short but precise description.", max_tokens: 200 };

            const prediction = await replicate.predictions.create({
                version: "19be067b589d0c46689ffa7cc3ff321447a441986a7694c01225973c2eafc874",
                input
            });

            let completed;
            while (true) {
                completed = await replicate.predictions.get(prediction.id);
                if (["failed", "succeeded", "canceled"].includes(completed.status)) break;
                await new Promise(res => setTimeout(res, 500));
            }

            if (completed.status === 'succeeded' && completed.output) {
                const descriptionPath = "generated/" + filePath + "/" + "description.txt"
                imageDescription = completed.output.join('').replace(/\n/g, ' ');

                const txtResponse = await fetch("/api/fileGen", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ fileName: descriptionPath, content: imageDescription, fileType: "txt" }),
                });

                if (!txtResponse.ok) {
                    const errorData = await txtResponse.json();
                    console.error("Error creating txt file:", errorData.error);
                }

                await txtResponse.json();

                setProgress(60);
                setStatus("Description generated correctly!");

                setTimeout(() => {
                    setUploading(false);
                    setUploaded(true);
                }, 1000);

            } else {
                setStatus("Description generation failed, plase wait a few minutes before try again.");
                console.error("Error in generating description. Replicate: " + completed);
                setUploading(false);
                return;
            }
        } catch (error) {
            setStatus("Description generation failed. Please try again.");
            console.error(error);
            setUploading(false);
            return;
        }

        //Image generation
        try {
            if (!process.env.REPLICATE_API_TOKEN) {
                setStatus('Missing API token. Please check your environment variables.');
                console.error('Missing API token');
                setUploading(false);
                return;
            }

            //REPLICATE API
            const input = {
                prompt: imageDescription,
                go_fast: true,
                guidance: 3.5,
                num_outputs: 1,
                aspect_ratio: "1:1",
                output_format: "webp",
                output_quality: 80,
                prompt_strength: 0.8,
                num_inference_steps: 28
            };

            const prediction = await replicate.predictions.create({
                model: "black-forest-labs/flux-dev",
                input
            });

            let completed;
            while (true) {
                completed = await replicate.predictions.get(prediction.id);
                if (["failed", "succeeded", "canceled"].includes(completed.status)) break;
                await new Promise(res => setTimeout(res, 500));
            }

            if (completed.status === 'succeeded' && completed.output) {
                const imagePath = "generated/" + filePath + "/" + "generated_image.webp"
                const imageUrl = completed.output[0];

                const imgResponse = await fetch("/api/fileGen", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ 
                        fileName: imagePath,
                        content: imageUrl,
                        fileType: "webp"
                    }),
                });

                if (!imgResponse.ok) {
                    const errorData = await imgResponse.json();
                    console.error("Error creating image file:", errorData.error);
                }

                await imgResponse.json();

                setProgress(80);
                setStatus("Image generated correctly!");

                setTimeout(() => {
                    setUploading(false);
                    setUploaded(true);
                }, 1000);
            } else {
                setStatus("Image generation failed, plase wait a few minutes before try again.");
                console.error("Error in generating image. Replicate: " + completed);
                setUploading(false);
                return;
            }
        } catch (error) {
            setStatus("Image generation failed. Please try again.");
            console.error(error);
            setUploading(false);
            return;
        }

        //Audio generation
        try {
            if (!process.env.REPLICATE_API_TOKEN) {
                setStatus('Missing API token. Please check your environment variables.');
                console.error('Missing API token');
                setUploading(false);
                return;
            }

            const availableSpeakers = [
                "https://rn2xk7sjthrsbxqc.public.blob.vercel-storage.com/audioBase/matteoAudio-ZRnpUs99H9sI7BurCppQjONxiFLIHp.wav",
                "https://rn2xk7sjthrsbxqc.public.blob.vercel-storage.com/audioBase/cathrineAudio-hS7GFKppvV8zEm92hImJGg7ApTZiaz.wav",
                "https://rn2xk7sjthrsbxqc.public.blob.vercel-storage.com/audioBase/hannaAudio-KumIbXBPkK7Dsl4xYbdXGZUIgH2yVr.wav",
                "https://rn2xk7sjthrsbxqc.public.blob.vercel-storage.com/audioBase/aminaAudio-8fBwV71tY0yKhmKiV7MV4LMkZuHXFe.wav"];
    
            const randomIndex = Math.floor(Math.random() * availableSpeakers.length);
            const speaker = availableSpeakers[randomIndex];

            //REPLICATE API
            const input = {
                text: imageDescription,
                language: "en",
                speaker: speaker
            };

            const prediction = await replicate.predictions.create({
                version: "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e",
                input
            });

            let completed;
            while (true) {
                completed = await replicate.predictions.get(prediction.id);
                if (["failed", "succeeded", "canceled"].includes(completed.status)) break;
                await new Promise(res => setTimeout(res, 500));
            }

            if (completed.status === 'succeeded' && completed.output) {
                const audioPath = "generated/" + filePath + "/" + "generatedAudio.wav"
                const audioUrl = completed.output;
    
                const audioResponse = await fetch("/api/fileGen", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ 
                        fileName: audioPath,
                        content: audioUrl,
                        fileType: "wav"
                    }),
                });
    
                if (!audioResponse.ok) {
                    const errorData = await audioResponse.json();
                    console.error("Error creating audio file:", errorData.error);
                }
    
                await audioResponse.json();
    
                setProgress(100);
                setStatus("Audio generated correctly!");
    
                setTimeout(() => {
                    setUploading(false);
                    setUploaded(true);
                }, 1000);
            } else {
                setStatus("Description generation failed, plase wait a few minutes before try again.");
                console.error("Error in generating. Replicate: " + completed);
                setUploading(false);
                return;
            }
        } catch (error) {
            setStatus("Audio generation failed. Please try again.");
            console.error(error);
            setUploading(false);
            return;
        }

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