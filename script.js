// O LINK DO SEU MODELO:
const URL = "https://teachablemachine.withgoogle.com/models/-RXno36Vr/";

// MAPA DE DESCARTE (Configure esta seção com os nomes exatos das suas classes!)
const DISPOSAL_MAP = {
    "Papel": { // Nome da Classe. Ex: "Papel"
        lixeira: "LIXEIRA AZUL",
        cor: "#3f51b5",
        instrucao: "Papel e Papelão. Mantenha limpo e seco.",
        simbolo: "📦"
    },
    "Plastico": { // Nome da Classe. Ex: "Plastico"
        lixeira: "LIXEIRA VERMELHA",
        cor: "#ff6347",
        instrucao: "Plástico. Lave antes de descartar.",
        simbolo: "🥤"
    },
    "Metal": { // Nome da Classe. Ex: "Metal"
        lixeira: "LIXEIRA AMARELA",
        cor: "#ffd700",
        instrucao: "Metal. Amasse latas para economizar espaço.",
        simbolo: "🥫"
    },
    "Vidro": { // Nome da Classe. Ex: "Vidro"
        lixeira: "LIXEIRA VERDE",
        cor: "#00a65a",
        instrucao: "Vidro. Descarte com segurança.",
        simbolo: "🍾"
    },
    "Organico": { // Nome da Classe. Ex: "Organico" ou "Rejeito"
        lixeira: "LIXEIRA COMUM",
        cor: "#444444",
        instrucao: "Lixo Comum/Rejeito. Não Reciclável.",
        simbolo: "🗑️"
    },
    "Background": {
        lixeira: "NENHUM OBJETO",
        cor: "#cccccc",
        instrucao: "Aproxime o objeto para classificação.",
        simbolo: "🔍"
    }
};

let model, webcam, maxPredictions;
let isPaused = false;
let currentMode = null;

// Elementos da Interface (Referências do DOM)
const webcamModeDiv = document.getElementById("webcam-mode");
const uploadModeDiv = document.getElementById("upload-mode");
const labelContainer = document.getElementById("label-container");
const pauseButton = document.getElementById("pauseButton");

// Elementos do Upload
const fileUpload = document.getElementById("file-upload");
const uploadedImage = document.getElementById("uploaded-image");
const classifyButton = document.getElementById("classify-button");


// ----------------------------------------------------
// INICIALIZAÇÃO E CONTROLE DE MODO
// ----------------------------------------------------

async function init() {
    labelContainer.innerHTML = "Carregando modelo de IA...";
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        labelContainer.innerHTML = "Modelo pronto! Escolha um modo de operação.";
        setupModeListeners();
    } catch (e) {
        labelContainer.innerHTML = "ERRO ao carregar o modelo. Verifique o link e a conexão.";
        console.error(e);
    }
}

function setupModeListeners() {
    document.getElementById("mode-webcam").onclick = () => switchMode('webcam');
    document.getElementById("mode-upload").onclick = () => switchMode('upload');

    setupUploadListeners();

    pauseButton.onclick = () => {
        if (isPaused) {
            resumeWebcam();
        } else {
            pauseWebcam();
        }
    };
}

function switchMode(mode) {
    webcamModeDiv.style.display = 'none';
    uploadModeDiv.style.display = 'none';

    if (webcam && webcam.isStarted) {
        webcam.stop();
    }

    labelContainer.style.color = '#333';
    labelContainer.innerHTML = "Preparando o modo...";

    if (mode === 'webcam') {
        webcamModeDiv.style.display = 'block';
        if (!webcam) {
            initWebcam();
        } else {
            webcam.play();
            window.requestAnimationFrame(loop);
            labelContainer.innerHTML = "Aponte o objeto para a câmera...";
        }
        currentMode = 'webcam';
    } else if (mode === 'upload') {
        uploadModeDiv.style.display = 'block';
        currentMode = 'upload';
        uploadedImage.style.display = 'none';
        classifyButton.disabled = true;
        labelContainer.innerHTML = "Carregue uma imagem.";
    }
}

async function initWebcam() {
    const flip = true;
    const width = 300;
    const height = 300;

    // --- NOVO CÓDIGO AQUI: CONFIGURAÇÃO DE DISPOSITIVO ---

    // O objeto de configuração `webcamSettings` instrui o navegador.
    // O parâmetro 'environment' (ambiente) indica a câmera traseira.
    const webcamSettings = {
        facingMode: 'environment'
    };

    webcam = new tmImage.Webcam(width, height, flip, webcamSettings); // Passando a nova configuração

    try {
        await webcam.setup();
        await webcam.play();
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        window.requestAnimationFrame(loop);
        labelContainer.innerHTML = "Câmera iniciada. Aponte o objeto.";
    } catch (e) {
        // Se o navegador não encontrar a câmera traseira (em PCs sem ela, por exemplo), 
        // ele voltará para a câmera frontal, se disponível.
        console.error("Erro ao iniciar a câmera traseira. Tentando a câmera padrão.", e);

        // Tenta iniciar a câmera padrão (que geralmente é a frontal em PCs) como fallback
        webcam = new tmImage.Webcam(width, height, flip);
        await webcam.setup();
        await webcam.play();
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        window.requestAnimationFrame(loop);
        labelContainer.innerHTML = "Câmera frontal usada (padrão).";
    }
}


// ----------------------------------------------------
// FUNÇÕES DO MODO WEBCAM
// ----------------------------------------------------

async function loop() {
    if (currentMode === 'webcam' && !isPaused) {
        webcam.update();
        await predictWebcam();
    }
    window.requestAnimationFrame(loop);
}

async function predictWebcam() {
    const prediction = await model.predict(webcam.canvas);
    displayPredictionResult(prediction);
}

function pauseWebcam() {
    isPaused = true;
    webcam.pause();
    pauseButton.textContent = "▶️ Continuar";
    // O resultado congela, o displayPredictionResult já fez o trabalho
}

function resumeWebcam() {
    isPaused = false;
    webcam.play();
    pauseButton.textContent = "⏸️ Pausar";
    window.requestAnimationFrame(loop);
}


// ----------------------------------------------------
// FUNÇÕES DO MODO UPLOAD
// ----------------------------------------------------

function setupUploadListeners() {
    fileUpload.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            // Usando FileReader (solução robusta)
            const reader = new FileReader();
            reader.onload = function (e) {
                uploadedImage.src = e.target.result;
                uploadedImage.style.display = 'block';
                classifyButton.disabled = false;
                labelContainer.innerHTML = "Imagem carregada. Clique em Classificar.";
            }
            reader.readAsDataURL(file);
        } else {
            uploadedImage.style.display = 'none';
            classifyButton.disabled = true;
            labelContainer.innerHTML = "Carregue uma imagem.";
        }
    });

    classifyButton.addEventListener("click", () => {
        if (uploadedImage.style.display !== 'none') {
            predictUpload();
        }
    });
}

async function predictUpload() {
    labelContainer.innerHTML = "Classificando...";
    classifyButton.disabled = true;

    const prediction = await model.predict(uploadedImage);

    displayPredictionResult(prediction);
    classifyButton.disabled = false;
}

// ----------------------------------------------------
// FUNÇÃO DE EXIBIÇÃO DE RESULTADO
// ----------------------------------------------------

function displayPredictionResult(prediction) {
    let highestPrediction = { className: "Background", probability: 0 };
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestPrediction.probability) {
            highestPrediction = prediction[i];
        }
    }

    const bestClassName = highestPrediction.className;
    const probabilityPercent = (highestPrediction.probability * 100).toFixed(0);

    // Mapeia o resultado para as instruções (usa "Background" se não encontrar)
    const disposalInfo = DISPOSAL_MAP[bestClassName] || DISPOSAL_MAP["Background"];

    // DEFINIÇÃO DOS LIMITES DE CERTEZA
    const threshold_alta_certeza = 0.85; // 85% para certeza total
    const threshold_media_certeza = 0.50; // 50% para "Eu acredito que seja..."


    if (highestPrediction.probability >= threshold_alta_certeza) {
        // 1. CERTEZA ALTA (85% ou mais)
        labelContainer.style.color = disposalInfo.cor;
        labelContainer.innerHTML =
            `✅ IDENTIFICADO: ${bestClassName}` +
            `<br>➡️ ${disposalInfo.lixeira} ${disposalInfo.simbolo}` +
            `<br><span style="font-size: 0.8em; font-weight: 500;">Dica: ${disposalInfo.instrucao}</span>`;

    } else if (highestPrediction.probability >= threshold_media_certeza) {
        // 2. CERTEZA MÉDIA (Entre 50% e 84%) - Mensagem Amigável
        labelContainer.style.color = '#3f93a9'; // Azul claro/Ciano para sugestão
        labelContainer.innerHTML =
            `🤔 Acredito que seja ${bestClassName} (${probabilityPercent}%)` +
            `<br>➡️ SUGIRO: ${disposalInfo.lixeira} ${disposalInfo.simbolo}` +
            `<br><span style="font-size: 0.8em; font-weight: 500;">Dica: ${disposalInfo.instrucao}</span>`;

    } else {
        // 3. CERTEZA BAIXA (Menos de 50%) ou BACKGROUND
        labelContainer.style.color = '#ff6347'; // Laranja de alerta
        labelContainer.innerHTML =
            `🔍 INCONCLUSIVO: Certeza de apenas ${probabilityPercent}% (${bestClassName})` +
            `<br>Aproxime o objeto ou use o Modo Upload.`;
    }
}

// Chamada inicial para começar o projeto
window.onload = init;