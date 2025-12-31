// --------------------------------------------------------
// Helper Functions (API & Logic)
// --------------------------------------------------------

// Generate nanoid for unique filename
function generateNanoId(length = 21) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Upload file to CDN storage (called immediately when file is selected)
async function uploadFile(file) {
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueId = generateNanoId();
    // Filename is just nanoid.extension
    const fileName = uniqueId + '.' + fileExtension;
    
    // Step 1: Get signed URL from API
    const signedUrlResponse = await fetch(
        'https://api.chromastudio.ai/get-emd-upload-url?fileName=' + encodeURIComponent(fileName),
        { method: 'GET' }
    );
    
    if (!signedUrlResponse.ok) {
        throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
    }
    
    const signedUrl = await signedUrlResponse.text();
    console.log('Got signed URL');
    
    // Step 2: PUT file to signed URL
    const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type
        }
    });
    
    if (!uploadResponse.ok) {
        throw new Error('Failed to upload file: ' + uploadResponse.statusText);
    }
    
    // Step 3: Return download URL
    const downloadUrl = 'https://contents.maxstudio.ai/' + fileName;
    console.log('Uploaded to:', downloadUrl);
    return downloadUrl;
}

// Submit generation job (Image)
async function submitImageGenJob(imageUrl) {
    const endpoint = 'https://api.chromastudio.ai/image-gen';
    
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        'sec-ch-ua-mobile': '?0'
    };

    const body = {
        model: 'image-effects',
        toolType: 'image-effects',
        effectId: 'pixarStyle',
        imageUrl: imageUrl,
        userId: 'DObRu1vyStbUynoQmTcHBlhs55z2',
        removeWatermark: true,
        isPrivate: true
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        throw new Error('Failed to submit job: ' + response.statusText);
    }
    
    const data = await response.json();
    console.log('Job submitted:', data.jobId, 'Status:', data.status);
    return data;
}

// Poll job status until completed or failed
const USER_ID = 'DObRu1vyStbUynoQmTcHBlhs55z2';
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLLS = 60; // Max 2 minutes

async function pollJobStatus(jobId) {
    const baseUrl = 'https://api.chromastudio.ai/image-gen';
    let polls = 0;
    
    // Access UI updater function defined in DOMContentLoaded or duplicate logic here
    const updateStatusText = (text) => {
        // Robust selector: Try ID, Class, then fallback to p tag inside loading-state
        const statusText = document.getElementById('status-text') || 
                           document.querySelector('.status-text') || 
                           document.querySelector('#loading-state p');
        
        if (statusText) statusText.textContent = text;
        const btn = document.getElementById('generate-btn');
        if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
    };

    while (polls < MAX_POLLS) {
        const response = await fetch(
            `${baseUrl}/${USER_ID}/${jobId}/status`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to check status: ' + response.statusText);
        }
        
        const data = await response.json();
        console.log('Poll', polls + 1, '- Status:', data.status);
        
        if (data.status === 'completed') {
            console.log('Job completed!');
            return data;
        }
        
        if (data.status === 'failed' || data.status === 'error') {
            throw new Error(data.error || 'Job processing failed');
        }
        
        updateStatusText('Processing... ' + Math.round(((polls+1)/MAX_POLLS)*100) + '%');
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        polls++;
    }
    
    throw new Error('Job timed out after ' + MAX_POLLS + ' polls');
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --------------------------------------------------------
    // Mobile Menu Toggle
    // --------------------------------------------------------
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (nav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            });
        });
    }

    // --------------------------------------------------------
    // Scroll Animations (IntersectionObserver)
    // --------------------------------------------------------
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // --------------------------------------------------------
    // FAQ Accordion
    // --------------------------------------------------------
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isOpen = question.classList.contains('active');
            
            document.querySelectorAll('.faq-question').forEach(q => {
                q.classList.remove('active');
                q.nextElementSibling.style.maxHeight = null;
            });

            if (!isOpen) {
                question.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });

    // --------------------------------------------------------
    // REAL BACKEND LOGIC & PLAYGROUND
    // --------------------------------------------------------
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const uploadContent = document.querySelector('.upload-content');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultContainer = document.getElementById('result-container');
    const loadingState = document.getElementById('loading-state');
    const resultPlaceholder = document.querySelector('.result-placeholder');
    const downloadBtn = document.getElementById('download-btn');
    
    // Robust status text selection: Try class, then ID, then structural search inside loading state
    const statusText = document.querySelector('.status-text') || 
                       document.getElementById('status-text') || 
                       (loadingState && loadingState.querySelector('p')) || 
                       document.createElement('p');

    // State
    let currentUploadedUrl = null;

    // UI Helpers
    function showLoading() {
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
        if (loadingState) loadingState.classList.remove('hidden');
        if (loadingState) loadingState.style.display = 'flex';
        // Clear previous results
        const oldResult = document.getElementById('result-final');
        if (oldResult) oldResult.style.display = 'none';
        const oldVideo = document.getElementById('result-video');
        if (oldVideo) oldVideo.style.display = 'none';
    }

    function hideLoading() {
        if (loadingState) loadingState.classList.add('hidden');
        if (loadingState) loadingState.style.display = 'none';
    }

    function updateStatus(text) {
        if (statusText) statusText.textContent = text;
        if (generateBtn) {
            if (text.includes('UPLOADING') || text.includes('PROCESSING') || text.includes('SUBMITTING')) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
            } else if (text === 'READY') {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic"></i> Apply Effect';
            } else if (text === 'COMPLETE') {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fa-solid fa-check"></i> Done (Regenerate)';
            }
        }
    }

    function showError(msg) {
        alert('Error: ' + msg);
        updateStatus('ERROR');
        hideLoading();
        if (generateBtn) generateBtn.disabled = false;
    }

    function showPreview(url) {
        if (previewImage) {
            previewImage.src = url;
            previewImage.classList.remove('hidden');
        }
        if (uploadContent) uploadContent.classList.add('hidden');
        if (resetBtn) resetBtn.disabled = false;
    }

    function showResultMedia(url) {
        const isVideo = url.toLowerCase().match(/\.(mp4|webm)(\?.*)?$/i);
        
        // Hide image
        let resultImg = document.getElementById('result-final');
        if (!resultImg) {
            resultImg = document.createElement('img');
            resultImg.id = 'result-final';
            resultImg.className = 'w-full h-auto rounded-lg';
            resultContainer.appendChild(resultImg);
        }
        
        // Hide video
        let video = document.getElementById('result-video');

        if (isVideo) {
            if (resultImg) resultImg.style.display = 'none';
            if (!video) {
                video = document.createElement('video');
                video.id = 'result-video';
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.className = 'w-full h-auto rounded-lg';
                resultContainer.appendChild(video);
            }
            video.src = url;
            video.style.display = 'block';
        } else {
            if (video) video.style.display = 'none';
            resultImg.style.display = 'block';
            resultImg.style.animation = 'fadeIn 0.5s ease';
            // Important: NO crossOrigin here for display to prevent CORS errors on simple GET
            resultImg.src = url + '?t=' + new Date().getTime();
        }

        if (downloadBtn) {
            downloadBtn.dataset.url = url;
            downloadBtn.classList.remove('hidden');
            downloadBtn.style.display = 'inline-block';
        }
    }

    // 1. FILE UPLOAD HANDLER
    async function handleFileSelect(file) {
        try {
            updateStatus('UPLOADING...');
            // Show local preview immediately if possible, or wait for URL
            const reader = new FileReader();
            reader.onload = (e) => {
                 if(previewImage) {
                    previewImage.src = e.target.result;
                    previewImage.classList.remove('hidden');
                    uploadContent.classList.add('hidden');
                 }
            };
            reader.readAsDataURL(file);

            // Real Upload
            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            // Show URL preview (optional, confirms upload)
            console.log("File ready at: " + uploadedUrl);
            
            updateStatus('READY');
            if (resetBtn) resetBtn.disabled = false;
            
        } catch (error) {
            console.error(error);
            showError(error.message);
        }
    }

    // Wiring File Inputs
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--primary)';
            uploadZone.style.background = '#FFF0F5';
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '';
            uploadZone.style.background = '';
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '';
            uploadZone.style.background = '';
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        });
        
        // Click to upload
        uploadZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileSelect(file);
        });
    }

    // 2. GENERATE HANDLER
    async function handleGenerate() {
        if (!currentUploadedUrl) {
            alert('Please upload an image first');
            return;
        }
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // Step 1: Submit
            const jobData = await submitImageGenJob(currentUploadedUrl);
            console.log('Job ID:', jobData.jobId);
            
            updateStatus('QUEUED...');
            
            // Step 2: Poll
            const result = await pollJobStatus(jobData.jobId);
            
            // Step 3: Parse Result
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.video || resultItem?.image;
            
            if (!resultUrl) {
                throw new Error('No image URL in response');
            }
            
            // Step 4: Display
            showResultMedia(resultUrl);
            currentUploadedUrl = resultUrl; // For chain generation if needed, mostly for download
            
            updateStatus('COMPLETE');
            hideLoading();
            
        } catch (error) {
            console.error(error);
            showError(error.message);
        }
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // 3. DOWNLOAD HANDLER (Robust)
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.innerHTML;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.disabled = true;
            
            // Helper to trigger download from blob
            function downloadBlob(blob, filename) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }
            
            function getExtension(url, contentType) {
                if (contentType) {
                    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
                    if (contentType.includes('png')) return 'png';
                    if (contentType.includes('webp')) return 'webp';
                }
                const match = url.match(/\.(jpe?g|png|webp|mp4|webm)/i);
                return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
            }
            
            try {
                // STRATEGY 1: Proxy
                const proxyUrl = 'https://api.chromastudio.ai/download-proxy?url=' + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Proxy failed');
                const blob = await response.blob();
                downloadBlob(blob, 'pixar_effect_' + generateNanoId(8) + '.' + getExtension(url, response.headers.get('content-type')));
                
            } catch (proxyErr) {
                console.warn('Proxy download failed, trying direct:', proxyErr);
                
                // STRATEGY 2: Direct Fetch
                try {
                    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
                    const response = await fetch(fetchUrl, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        downloadBlob(blob, 'pixar_effect_' + generateNanoId(8) + '.' + getExtension(url, response.headers.get('content-type')));
                        return;
                    }
                    throw new Error('Direct fetch failed');
                } catch (fetchErr) {
                    console.warn('Direct fetch failed:', fetchErr);
                    
                    // STRATEGY 3: Canvas (Images only)
                    const img = document.getElementById('result-final');
                    if (img && img.style.display !== 'none') {
                        // Reload with CORS to draw on canvas
                        const tempImg = new Image();
                        tempImg.crossOrigin = 'anonymous';
                        tempImg.onload = function() {
                            const canvas = document.createElement('canvas');
                            canvas.width = tempImg.naturalWidth;
                            canvas.height = tempImg.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(tempImg, 0, 0);
                            canvas.toBlob((blob) => {
                                if (blob) {
                                    downloadBlob(blob, 'pixar_effect_' + generateNanoId(8) + '.png');
                                } else {
                                    forceLink();
                                }
                            });
                        };
                        tempImg.onerror = forceLink;
                        tempImg.src = url + '?cors=' + Date.now();
                    } else {
                        forceLink();
                    }
                    
                    function forceLink() {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'pixar_effect_result';
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }
            } finally {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }
        });
    }

    // 4. RESET HANDLER
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentUploadedUrl = null;
            if (fileInput) fileInput.value = '';
            
            if (previewImage) {
                previewImage.classList.add('hidden');
                previewImage.src = '';
            }
            if (uploadContent) uploadContent.classList.remove('hidden');
            
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic"></i> Apply Effect';
            }
            if (resetBtn) resetBtn.disabled = true;
            
            // Reset Result Area
            const finalResult = document.getElementById('result-final');
            if (finalResult) finalResult.style.display = 'none';
            const finalVideo = document.getElementById('result-video');
            if (finalVideo) finalVideo.style.display = 'none';
            
            if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
            if (downloadBtn) downloadBtn.classList.add('hidden');
            
            updateStatus('');
        });
    }

    // --------------------------------------------------------
    // Modals (Privacy / Terms) - Preserved
    // --------------------------------------------------------
    const openModalBtns = document.querySelectorAll('[data-modal-target]');
    const closeModalBtns = document.querySelectorAll('[data-modal-close]');
    
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    openModalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-modal-target');
            openModal(target);
        });
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-modal-close');
            closeModal(target);
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // --------------------------------------------------------
    // Mouse Effect - Preserved
    // --------------------------------------------------------
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        document.documentElement.style.setProperty('--mouse-x', x);
        document.documentElement.style.setProperty('--mouse-y', y);
        
        const heroBg = document.querySelector('.hero-bg-animation');
        if (heroBg) {
            heroBg.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
        }
    });
});