// Signature drawing logic
const sigCanvas = document.getElementById('signature');
const sigCtx = sigCanvas.getContext('2d');
let drawing = false;
let lastX = 0, lastY = 0;

function startDraw(e) {
    if (e.touches) e.preventDefault();
    drawing = true;
    [lastX, lastY] = getXY(e);
}
function draw(e) {
    if (!drawing) return;
    if (e.touches) e.preventDefault();
    const [x, y] = getXY(e);
    sigCtx.lineWidth = 2;
    sigCtx.lineCap = 'round';
    sigCtx.strokeStyle = '#222';
    sigCtx.beginPath();
    sigCtx.moveTo(lastX, lastY);
    sigCtx.lineTo(x, y);
    sigCtx.stroke(); // Ensure stroke is always called
    [lastX, lastY] = [x, y];
    // Debug: confirm drawing
    // console.log('Drawing at', x, y);
}
function endDraw(e) {
    if (e && e.touches) e.preventDefault();
    drawing = false;
}
function getXY(e) {
    const rect = sigCanvas.getBoundingClientRect();
    if (e.touches) {
        return [e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top];
    } else {
        return [e.offsetX, e.offsetY];
    }
}

sigCanvas.addEventListener('mousedown', startDraw);
sigCanvas.addEventListener('mousemove', draw);
sigCanvas.addEventListener('mouseup', endDraw);
sigCanvas.addEventListener('mouseleave', endDraw);
sigCanvas.addEventListener('touchstart', startDraw, { passive: false });
sigCanvas.addEventListener('touchmove', draw, { passive: false });
sigCanvas.addEventListener('touchend', endDraw, { passive: false });

document.getElementById('clearSig').onclick = function(e) {
    e.preventDefault();
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
};

// Photo upload and cropping logic
let uploadedPhoto = null;
let croppedPhoto = null;
const photoInput = document.getElementById('photoInput');
const photoCropSection = document.getElementById('photoCropSection');
const cropCanvas = document.getElementById('cropCanvas');
const cropCtx = cropCanvas.getContext('2d');
const confirmCropBtn = document.getElementById('confirmCrop');
const photoPreview = document.getElementById('photoPreview');

photoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            uploadedPhoto = img;
            // Draw image to crop canvas, fit to canvas
            cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
            // Calculate scale to fit
            let scale = Math.max(cropCanvas.width / img.width, cropCanvas.height / img.height);
            let w = img.width * scale;
            let h = img.height * scale;
            let x = (cropCanvas.width - w) / 2;
            let y = (cropCanvas.height - h) / 2;
            cropCtx.drawImage(img, x, y, w, h);
            photoCropSection.style.display = 'flex';
            photoPreview.style.display = 'none';
            croppedPhoto = null;
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
});

// Simple cropping: user can drag a rectangle to crop
let cropStart = null;
let cropRect = null;

cropCanvas.addEventListener('mousedown', function(e) {
    cropStart = getCropXY(e);
    cropRect = null;
});
cropCanvas.addEventListener('mousemove', function(e) {
    if (!cropStart) return;
    const [x, y] = getCropXY(e);
    cropRect = {
        x: Math.min(cropStart[0], x),
        y: Math.min(cropStart[1], y),
        w: Math.abs(cropStart[0] - x),
        h: Math.abs(cropStart[1] - y)
    };
    // Redraw image and rectangle
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    if (uploadedPhoto) {
        let scale = Math.max(cropCanvas.width / uploadedPhoto.width, cropCanvas.height / uploadedPhoto.height);
        let w = uploadedPhoto.width * scale;
        let h = uploadedPhoto.height * scale;
        let x0 = (cropCanvas.width - w) / 2;
        let y0 = (cropCanvas.height - h) / 2;
        cropCtx.drawImage(uploadedPhoto, x0, y0, w, h);
    }
    if (cropRect) {
        cropCtx.strokeStyle = '#007b3a';
        cropCtx.lineWidth = 1;
        cropCtx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }
});
cropCanvas.addEventListener('mouseup', function(e) {
    if (!cropRect || !uploadedPhoto) {
        cropStart = null;
        return;
    }
    // Get cropped image data (may include stroke if visible)
    const imageData = cropCtx.getImageData(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    // Create a temp canvas to hold the cropped image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropRect.w;
    tempCanvas.height = cropRect.h;
    tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
    croppedPhoto = new Image();
    croppedPhoto.onload = function() {
        photoPreview.src = croppedPhoto.src;
        photoPreview.style.display = 'block';
    };
    croppedPhoto.src = tempCanvas.toDataURL('image/png');
    cropStart = null;
});
function getCropXY(e) {
    const rect = cropCanvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
}

confirmCropBtn.addEventListener('click', function() {
    if (croppedPhoto) {
        photoCropSection.style.display = 'none';
        photoPreview.style.display = 'block';
    } else {
        alert('Please select and crop your photo.');
    }
});

// Form logic
const form = document.getElementById('idForm');
const cardPreview = document.getElementById('cardPreview');
const idCardCanvas = document.getElementById('idCardCanvas');
const downloadBtn = document.getElementById('downloadBtn');

function updateIDCardHtml(data) {
    document.getElementById('serialNumberHtml').textContent = data.serialNumber;
    document.getElementById('idNumberHtml').textContent = data.idNumber;
    document.getElementById('fullNameHtml').textContent = data.name.toUpperCase();
    document.getElementById('dobHtml').textContent = formatDate(data.dob);
    document.getElementById('sexHtml').textContent = data.sex.toUpperCase();
    document.getElementById('districtHtml').textContent = data.district.toUpperCase();
    document.getElementById('placeHtml').textContent = data.place.toUpperCase();
    document.getElementById('issueDateHtml').textContent = formatDate(data.dateOfIssue);
    // Set photo
    if (data.photo) {
        document.getElementById('photoHtml').src = data.photo.src || data.photo;
    }
    // Set signature
    if (data.signature) {
        document.getElementById('signatureHtml').src = data.signature.toDataURL ? data.signature.toDataURL() : data.signature;
    }
}

form.onsubmit = function(e) {
    e.preventDefault();
    // Validate
    const name = document.getElementById('fullName').value.trim();
    const dob = document.getElementById('dob').value;
    const sex = document.getElementById('sex').value;
    const district = document.getElementById('district').value.trim();
    const place = document.getElementById('place').value.trim();
    if (!name || !dob || !sex || !district || !place) {
        alert('Please fill all fields.');
        return;
    }
    if (!croppedPhoto) {
        alert('Please upload and crop your photo.');
        return;
    }
    if (name.length > 30) {
        alert('Full Name must be at most 30 letters.');
        return;
    }
    if (district.length > 15) {
        alert('District of Birth must be at most 15 letters.');
        return;
    }
    if (place.length > 15) {
        alert('Place of Issue must be at most 15 letters.');
        return;
    }
    // Age check
    const dobDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear() - (today < new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate()) ? 1 : 0);
    if (age < 18) {
        alert('User must be at least 18 years old.');
        return;
    }
    // Check signature
    const sigBlank = isCanvasBlank(sigCanvas);
    if (sigBlank) {
        alert('Please draw your signature.');
        return;
    }
    // Generate
    const dateOfIssue = today.toISOString().slice(0,10);
    const idNumber = randomDigits(8);
    const serialNumber = randomDigits(9);
    // Prepare signature as image
    let signatureImg = document.createElement('canvas');
    signatureImg.width = sigCanvas.width;
    signatureImg.height = sigCanvas.height;
    signatureImg.getContext('2d').drawImage(sigCanvas, 0, 0);
    // Update HTML card
    updateIDCardHtml({
        name, dob, sex, district, place, dateOfIssue, idNumber, serialNumber,
        signature: signatureImg,
        photo: croppedPhoto
    });
    cardPreview.style.display = 'block';
};

downloadBtn.onclick = function() {
    const cardDiv = document.getElementById('idCardHtml');
    // Wait for all images in the preview to load
    const images = cardDiv.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = img.onerror = resolve;
        });
    });
    Promise.all(promises).then(() => {
        html2canvas(cardDiv, {backgroundColor: null, scale: 2}).then(function(canvas) {
            const link = document.createElement('a');
            link.download = 'kenya_id_card.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
};

function randomDigits(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
        s += Math.floor(Math.random() * 10);
    }
    return s;
}

function isCanvasBlank(canvas) {
    const ctx = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
}

function drawIDCard(data) {
    const ctx = idCardCanvas.getContext('2d');
    ctx.clearRect(0, 0, idCardCanvas.width, idCardCanvas.height);
    // White background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, idCardCanvas.width, idCardCanvas.height);
    // Header
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#217346';
    ctx.textAlign = 'left';
    ctx.fillText('JAMHURI YA KENYA', 40, 60);
    ctx.textAlign = 'right';
    ctx.fillText('REPUBLIC OF KENYA', 640, 60);
    // Coat of arms (centered, with more vertical space)
    const coatArms = document.getElementById('coatArmsImg');
    ctx.drawImage(coatArms, 295, 70, 90, 60);
    // Shield below coat of arms, centered
    const shield = document.getElementById('shieldImg');
    ctx.drawImage(shield, 325, 135, 40, 60);
    // Serial Number (under left header)
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = '#222';
    ctx.textAlign = 'left';
    ctx.fillText('SERIAL NUMBER:', 40, 160);
    ctx.font = 'bold 22px Arial';
    ctx.fillText(data.serialNumber, 180, 160);
    // ID Number (under right header)
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('ID NUMBER:', 640, 160);
    ctx.font = 'bold 22px Arial';
    ctx.fillText(data.idNumber, 770, 160);
    // Full Names (below serial number)
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('FULL NAMES', 40, 200);
    ctx.font = 'bold 22px Arial';
    ctx.fillText(data.name.toUpperCase(), 40, 230);
    // Photo (rectangular, left, no border)
    const photoX = 40, photoY = 245, photoW = 200, photoH = 230;
    if (data.photo) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(photoX, photoY, photoW, photoH);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(data.photo, photoX, photoY, photoW, photoH);
        ctx.restore();
    }
    // Signature (below photo, not overlapping)
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#222';
    ctx.fillText("HOLDER'S SIGN.", photoX, photoY + photoH + 30);
    ctx.drawImage(data.signature, photoX + 110, photoY + photoH + 10, 90, 30);
    // Details column (aligned with top of photo)
    let detailsX = 270, detailsY = 245, lineGap = 35, labelW = 160, valueX = 520;
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#222';
    ctx.textAlign = 'left';
    ctx.fillText('DATE OF BIRTH', detailsX, detailsY);
    ctx.font = '20px Arial';
    ctx.fillText(formatDate(data.dob), valueX, detailsY);
    ctx.font = 'bold 13px Arial';
    ctx.fillText('SEX', detailsX, detailsY + lineGap);
    ctx.font = '20px Arial';
    ctx.fillText(data.sex.toUpperCase(), valueX, detailsY + lineGap);
    ctx.font = 'bold 13px Arial';
    ctx.fillText('DISTRICT OF BIRTH', detailsX, detailsY + 2 * lineGap);
    ctx.font = '20px Arial';
    ctx.fillText(data.district.toUpperCase(), valueX, detailsY + 2 * lineGap);
    ctx.font = 'bold 13px Arial';
    ctx.fillText('PLACE OF ISSUE', detailsX, detailsY + 3 * lineGap);
    ctx.font = '20px Arial';
    ctx.fillText(data.place.toUpperCase(), valueX, detailsY + 3 * lineGap);
    ctx.font = 'bold 13px Arial';
    ctx.fillText('DATE OF ISSUE', detailsX, detailsY + 4 * lineGap);
    ctx.font = '20px Arial';
    ctx.fillText(formatDate(data.dateOfIssue), valueX, detailsY + 4 * lineGap);
    // Fingerprint (bottom right, larger and higher)
    const fingerprint = document.getElementById('fingerprintImg');
    ctx.drawImage(fingerprint, 600, 340, 140, 120);
    ctx.textAlign = 'left';
}
function formatDate(dateStr) {
    // Format as DD. MM. YYYY (with space after dot)
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}. ${mm}. ${yyyy}`;
} 