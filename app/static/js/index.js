/**
 * DGARD - Sistema Inteligente de Seguridad
 * JavaScript principal corregido
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar los componentes
    initializeModals();
    setupScrollEffects();
    setupFormValidation();
    setupFlashMessages();
    setupAnimations();
    setupCarousel(); // Asegurar que el carrusel se inicie
});

/**
 * Inicializa la funcionalidad de los modales
 */
function initializeModals() {
    // Elementos del modal de login
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeModal = document.getElementById('close-modal');
    
    // Elementos del modal de registro
    const registerModal = document.getElementById('register-modal');
    const closeRegisterModal = document.getElementById('close-register-modal');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    
    // Función para prevenir scroll cuando un modal está abierto
    function toggleBodyScroll(preventScroll, isRegisterModal = false) {
        if (preventScroll) {
            document.body.style.overflow = 'hidden'; // Bloquear el scroll de la página
            document.body.classList.add('modal-open');
        } else {
            document.body.style.overflow = ''; // Restaurar el scroll
            document.body.classList.remove('modal-open');
        }
        
        // Asegurar que los modales tengan scroll propio
        const loginModalContent = document.querySelector('#login-modal .bg-white');
        const registerModalContent = document.querySelector('#register-modal .bg-white');
        
        if (loginModalContent) loginModalContent.style.overflowY = 'auto';
        if (registerModalContent) registerModalContent.style.overflowY = 'auto';
    }
    
    // Eventos para modal de login
    if (loginBtn && loginModal && closeModal) {
        loginBtn.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
            toggleBodyScroll(true);
            // Añadir clase para animación de entrada
            setTimeout(() => {
                const modalContent = loginModal.querySelector('.bg-white');
                if (modalContent) modalContent.classList.add('modal-content');
            }, 10);
        });
        
        closeModal.addEventListener('click', () => {
            loginModal.classList.add('hidden');
            toggleBodyScroll(false);
        });
    }
    
    // Eventos para modal de registro
    if (registerModal && closeRegisterModal) {
        closeRegisterModal.addEventListener('click', () => {
            registerModal.classList.add('hidden');
            toggleBodyScroll(false);
        });
    }
    
    // Eventos para cambiar entre modales
    if (showRegister && showLogin) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.classList.add('hidden');
            registerModal.classList.remove('hidden');
            toggleBodyScroll(true, true); // Indicar que es modal de registro
            // Añadir clase para animación de entrada
            setTimeout(() => {
                const modalContent = registerModal.querySelector('.bg-white');
                if (modalContent) modalContent.classList.add('modal-content');
            }, 10);
        });
        
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.classList.add('hidden');
            loginModal.classList.remove('hidden');
            toggleBodyScroll(true); // Modal de login (no es registro)
            // Añadir clase para animación de entrada
            setTimeout(() => {
                const modalContent = loginModal.querySelector('.bg-white');
                if (modalContent) modalContent.classList.add('modal-content');
            }, 10);
        });
    }
    
    // Manejar el evento wheel de manera personalizada
    window.addEventListener('wheel', function(e) {
        // Solo prevenir el scroll cuando está abierto un modal que no sea el de registro
        const isLoginModalOpen = !loginModal.classList.contains('hidden');
        const isRegisterModalOpen = !registerModal.classList.contains('hidden');
        
        if (document.body.classList.contains('modal-open')) {
            // Si el modal de registro está abierto, permitir el scroll dentro del modal
            if (isRegisterModalOpen) {
                const registerContent = document.querySelector('#register-modal .bg-white');
                const rect = registerContent.getBoundingClientRect();
                
                // Verificar si el puntero está dentro del contenido del modal de registro
                if (e.clientX >= rect.left && e.clientX <= rect.right && 
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    // No prevenir el desplazamiento si está dentro del modal de registro
                    return;
                }
            }
            
            // Para cualquier otro caso, prevenir el desplazamiento
            e.preventDefault();
        }
    }, { passive: false });
}

/**
 * Configura el carrusel de imágenes y textos para el hero section
 */
function setupCarousel() {
    const carousel = document.getElementById('hero-carousel');
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    const navContainer = carousel.querySelector('.carousel-navigation');
    const prevBtn = carousel.querySelector('.carousel-control.prev');
    const nextBtn = carousel.querySelector('.carousel-control.next');
    let currentIndex = 0;
    let interval;
    
    const heroSection = document.querySelector('.hero-section');
    // Array de imágenes de fondo (se deben colocar en la carpeta static/img)
    const bgImages = ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg'];
    
    // Limpiar navegación primero (para evitar duplicados)
    navContainer.innerHTML = '';
    
    // Crear los indicadores de navegación
    slides.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('carousel-dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        navContainer.appendChild(dot);
    });
    
    function updateBackground(index) {
        // Actualizar imagen de fondo según el índice
        if (index < bgImages.length) {
            // Asegurarse de que la ruta es correcta
            heroSection.style.backgroundImage = `url('/static/img/${bgImages[index]}')`;
            // Agregamos un overlay oscuro para mejorar la legibilidad del texto
            heroSection.style.backgroundPosition = 'center';
            heroSection.style.backgroundSize = 'cover';
        }
    }
    
    function goToSlide(index) {
        // Actualizar clases para mostrar el slide correcto
        slides[currentIndex].classList.remove('active');
        const currentDot = navContainer.children[currentIndex];
        if (currentDot) currentDot.classList.remove('active');
        
        currentIndex = index;
        if (currentIndex >= slides.length) currentIndex = 0;
        if (currentIndex < 0) currentIndex = slides.length - 1;
        
        slides[currentIndex].classList.add('active');
        const newDot = navContainer.children[currentIndex];
        if (newDot) newDot.classList.add('active');
        
        // Actualizar imagen de fondo
        updateBackground(currentIndex);
        
        // Reiniciar el intervalo
        resetInterval();
    }
    
    function nextSlide() {
        goToSlide(currentIndex + 1);
    }
    
    function prevSlide() {
        goToSlide(currentIndex - 1);
    }
    
    function resetInterval() {
        clearInterval(interval);
        interval = setInterval(nextSlide, 5000); // Cambiar slide cada 5 segundos
    }
    
    // Configurar controles
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    // Iniciar el carrusel
    updateBackground(0); // Establecer imagen inicial
    resetInterval();
    
    // Pausar rotación al pasar el mouse sobre el carrusel
    carousel.addEventListener('mouseenter', () => clearInterval(interval));
    carousel.addEventListener('mouseleave', resetInterval);
}

/**
 * Configura efectos de scroll para la página
 */
function setupScrollEffects() {
    const navbar = document.querySelector('nav');
    const fadeElements = document.querySelectorAll('.feature-card, #contacto h2, #caracteristicas h2');
    
    // Función para detectar cuando un elemento es visible en la pantalla
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8
        );
    }
    
    // Añadir efecto de desvanecimiento a los elementos al hacer scroll
    function checkFadeElements() {
        fadeElements.forEach(element => {
            if (isElementInViewport(element)) {
                element.classList.add('fade-in-element', 'visible');
            }
        });
    }
    
    // Cambiar la apariencia del navbar al hacer scroll
    function handleNavbarScroll() {
        if (window.scrollY > 100) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    }
    
    // Aplicar clases iniciales
    fadeElements.forEach(element => {
        element.classList.add('fade-in-element');
    });
    
    // Verificar los elementos al cargar la página
    checkFadeElements();
    
    // Manejar eventos de scroll
    window.addEventListener('scroll', () => {
        handleNavbarScroll();
        checkFadeElements();
    });
}

/**
 * Validar formato de correo electrónico
 */
function validarEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
}

/**
 * Validar que el texto solo contenga letras y espacios
 */
function validarSoloLetras(texto) {
    const letrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    return letrasRegex.test(texto);
}

/**
 * Validar que el telefono solo contenga números y tenga 10 dígitos (formato mexicano)
 */
function validarTelefono(telefono) {
    const telefonoRegex = /^[0-9]{10}$/;
    return telefonoRegex.test(telefono);
}

/**
 * Validar seguridad de contraseña (mínimo 8 caracteres y al menos un número)
 */
function validarContrasena(contrasena) {
    // Al menos 8 caracteres y al menos 1 número
    const contrasenaRegex = /^(?=.*[0-9])(?=.*[a-zA-Z]).{8,}$/;
    return contrasenaRegex.test(contrasena);
}

/**
 * Verifica la fortaleza de la contraseña y actualiza el indicador visual
 */
function actualizarIndicadorContrasena(contrasena) {
    const indicador = document.querySelector('.password-strength-meter');
    if (!indicador) return;
    
    // Eliminar clases previas
    indicador.classList.remove('password-strength-weak', 'password-strength-medium', 'password-strength-strong');
    
    // Si la contraseña está vacía, mantener visible el medidor pero sin color
    if (!contrasena || contrasena.length === 0) {
        // Mantener el medidor visible pero sin nivel
        return;
    }
    
    // Criterios de fortaleza
    const longitud = contrasena.length >= 8;
    const tieneNumeros = /\d/.test(contrasena);
    const tieneLetras = /[a-zA-Z]/.test(contrasena);
    const tieneEspeciales = /[!@#$%^&*(),.?":{}|<>]/.test(contrasena);
    
    // Calcular fortaleza
    let fortaleza = 0;
    if (longitud) fortaleza++;
    if (tieneNumeros) fortaleza++;
    if (tieneLetras) fortaleza++;
    if (tieneEspeciales) fortaleza++;
    
    // Actualizar UI según fortaleza
    if (fortaleza <= 2) {
        indicador.classList.add('password-strength-weak');
    } else if (fortaleza === 3) {
        indicador.classList.add('password-strength-medium');
    } else {
        indicador.classList.add('password-strength-strong');
    }
}

/**
 * Configura la validación de los formularios
 */
function setupFormValidation() {
    // Configurar validación en tiempo real
    setupRealTimeValidation();
    
    // Validación del formulario de registro
    const registerForm = document.querySelector('form[action="/registro"]');
    if (registerForm) {
        const camposErrores = {}; // Objeto para rastrear errores por campo
        
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Limpiar errores previos
            Object.keys(camposErrores).forEach(campo => {
                if (camposErrores[campo]) {
                    ocultarErrorCampo(document.getElementById(campo));
                    camposErrores[campo] = false;
                }
            });
            
            const nombre = document.getElementById('nombre').value.trim();
            const apellidos = document.getElementById('apellidos').value.trim();
            const correo = document.getElementById('correo').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            const contrasena = document.getElementById('contrasena').value;
            const confirmarContrasena = document.getElementById('confirmar_contrasena').value;
            
            let tieneErrores = false;
            
            // Validar campos vacíos
            if (!nombre || !apellidos || !correo || !telefono || !contrasena || !confirmarContrasena) {
                showFlashMessage('error', 'Por favor complete todos los campos requeridos.');
                tieneErrores = true;
            }
            
            // Validar nombre
            if (nombre && !validarSoloLetras(nombre)) {
                mostrarErrorCampo(document.getElementById('nombre'), 'El nombre solo debe contener letras y espacios');
                camposErrores['nombre'] = true;
                tieneErrores = true;
            }
            
            // Validar apellidos
            if (apellidos && !validarSoloLetras(apellidos)) {
                mostrarErrorCampo(document.getElementById('apellidos'), 'Los apellidos solo deben contener letras y espacios');
                camposErrores['apellidos'] = true;
                tieneErrores = true;
            }
            
            // Validar correo
            if (correo && !validarEmail(correo)) {
                mostrarErrorCampo(document.getElementById('correo'), 'Ingrese un correo electrónico válido');
                camposErrores['correo'] = true;
                tieneErrores = true;
            }
            
            // Validar teléfono
            if (telefono && !validarTelefono(telefono)) {
                mostrarErrorCampo(document.getElementById('telefono'), 'El número telefónico debe contener 10 dígitos');
                camposErrores['telefono'] = true;
                tieneErrores = true;
            }
            
            // Validar contraseña
            if (contrasena && !validarContrasena(contrasena)) {
                mostrarErrorCampo(document.getElementById('contrasena'), 'La contraseña debe tener al menos 8 caracteres y contener al menos un número');
                camposErrores['contrasena'] = true;
                tieneErrores = true;
            }
            
            // Validar que las contraseñas coincidan (solo mostrar un mensaje)
            if (contrasena !== confirmarContrasena) {
                mostrarErrorCampo(document.getElementById('confirmar_contrasena'), 'Las contraseñas no coinciden');
                camposErrores['confirmar_contrasena'] = true;
                tieneErrores = true;
            }
            
            // Enviar el formulario si no hay errores
            if (!tieneErrores) {
                this.submit();
            } else {
                // Efecto de shake para indicar error
            }
        });
        
        // Configurar validación para confirmar contraseña
        const confirmarInput = document.getElementById('confirmar_contrasena');
        const contrasenaInput = document.getElementById('contrasena');
        
        if (confirmarInput && contrasenaInput) {
            confirmarInput.addEventListener('blur', function() {
                if (this.value && contrasenaInput.value !== this.value) {
                    this.classList.add('border-red-500');
                    mostrarErrorCampo(this, 'Las contraseñas no coinciden');
                } else {
                    this.classList.remove('border-red-500');
                    ocultarErrorCampo(this);
                }
            });
            
            // Actualizar validación cuando cambia la contraseña original
            contrasenaInput.addEventListener('input', function() {
                if (confirmarInput.value) {
                    if (this.value !== confirmarInput.value) {
                        confirmarInput.classList.add('border-red-500');
                        mostrarErrorCampo(confirmarInput, 'Las contraseñas no coinciden');
                    } else {
                        confirmarInput.classList.remove('border-red-500');
                        ocultarErrorCampo(confirmarInput);
                    }
                }
                
                // Actualizar indicador de fortaleza
                actualizarIndicadorContrasena(this.value);
            });
        }
    }
    
    // Validación del formulario de login
    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showFlashMessage('error', 'Por favor ingrese su correo y contraseña');
                return;
            }
            
            if (email && !validarEmail(email)) {
                mostrarErrorCampo(document.getElementById('email'), 'Ingrese un correo electrónico válido');
                return;
            }
            
            // Si pasa validaciones, enviar el formulario
            this.submit();
        });
    }
}

/**
 * Configura validación en tiempo real para los campos de formulario
 */
function setupRealTimeValidation() {
    // Validación en tiempo real para el formulario de registro
    const nombreInput = document.getElementById('nombre');
    const apellidosInput = document.getElementById('apellidos');
    const correoInput = document.getElementById('correo');
    const telefonoInput = document.getElementById('telefono');
    const contrasenaInput = document.getElementById('contrasena');
    
    if (nombreInput) {
        nombreInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !validarSoloLetras(value)) {
                this.classList.add('border-red-500');
                mostrarErrorCampo(this, 'El nombre solo debe contener letras y espacios');
            } else {
                this.classList.remove('border-red-500');
                ocultarErrorCampo(this);
            }
        });
    }
    
    if (apellidosInput) {
        apellidosInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !validarSoloLetras(value)) {
                this.classList.add('border-red-500');
                mostrarErrorCampo(this, 'Los apellidos solo deben contener letras y espacios');
            } else {
                this.classList.remove('border-red-500');
                ocultarErrorCampo(this);
            }
        });
    }
    
    if (correoInput) {
        correoInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !validarEmail(value)) {
                this.classList.add('border-red-500');
                mostrarErrorCampo(this, 'Ingrese un correo electrónico válido');
            } else {
                this.classList.remove('border-red-500');
                ocultarErrorCampo(this);
            }
        });
    }
    
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function() {
            // Permitir solo números
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Limitar a 10 dígitos
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
        });
        
        telefonoInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !validarTelefono(value)) {
                this.classList.add('border-red-500');
                mostrarErrorCampo(this, 'El número telefónico debe contener 10 dígitos');
            } else {
                this.classList.remove('border-red-500');
                ocultarErrorCampo(this);
            }
        });
    }
    
    if (contrasenaInput) {
        contrasenaInput.addEventListener('input', function() {
            // Actualizar indicador de fortaleza
            actualizarIndicadorContrasena(this.value);
        });
        
        contrasenaInput.addEventListener('blur', function() {
            if (this.value && !validarContrasena(this.value)) {
                this.classList.add('border-red-500');
                mostrarErrorCampo(this, 'La contraseña debe tener al menos 8 caracteres y contener al menos un número');
            } else {
                this.classList.remove('border-red-500');
                ocultarErrorCampo(this);
            }
        });
    }
}

/**
 * Muestra un mensaje de error debajo del campo
 */
function mostrarErrorCampo(campo, mensaje) {
    // Eliminar mensaje de error anterior si existe
    ocultarErrorCampo(campo);
    
    // Crear nuevo mensaje de error
    const errorMsg = document.createElement('p');
    errorMsg.className = 'text-red-500 text-xs mt-1 error-message';
    errorMsg.innerHTML = mensaje;
    
    // Insertar después del contenedor del campo (input-container) para mejor posicionamiento
    const container = campo.closest('.input-container') || campo.parentNode;
    container.parentNode.insertBefore(errorMsg, container.nextSibling);
}

/**
 * Oculta el mensaje de error debajo del campo
 */
function ocultarErrorCampo(campo) {
    if (!campo) return;
    
    // Buscar en el padre del contenedor para asegurar encontrar el mensaje
    const container = campo.closest('.input-container') || campo.parentNode;
    if (!container || !container.parentNode) return;
    
    const errorMsg = container.parentNode.querySelector('.error-message');
    if (errorMsg) {
        errorMsg.parentNode.removeChild(errorMsg);
    }
}

/**
 * Configura mensajes flash
 */
function setupFlashMessages() {
    const flashContainer = document.getElementById('flash-messages');
    if (!flashContainer) {
        // Crear contenedor si no existe
        const newFlashContainer = document.createElement('div');
        newFlashContainer.id = 'flash-messages';
        newFlashContainer.className = 'fixed top-4 right-4 z-50';
        document.body.appendChild(newFlashContainer);
    }
    
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(message => {
        // Añadir botón de cierre si no existe
        if (!message.querySelector('.close-flash')) {
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'close-flash absolute top-2 right-2 text-gray-500 hover:text-gray-700';
            closeButton.innerHTML = '<i class="fas fa-times"></i>';
            message.appendChild(closeButton);
        }
        
        // Configurar botones de cierre
        message.querySelectorAll('.close-flash').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                message.style.opacity = '0';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.parentNode.removeChild(message);
                    }
                }, 600);
            });
        });
        
        // Auto-ocultar los mensajes después de 5 segundos
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 600);
        }, 5000);
    });
}

/**
 * Muestra un mensaje flash dinámico
 */
function showFlashMessage(type, message) {
    let flashContainer = document.getElementById('flash-messages');
    
    if (!flashContainer) {
        flashContainer = document.createElement('div');
        flashContainer.id = 'flash-messages';
        flashContainer.className = 'fixed top-4 right-4 z-50';
        document.body.appendChild(flashContainer);
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'new-message-box flash-message';
    messageDiv.style.animation = 'slideIn 0.5s ease-out';
    
    // Estructura basada en el nuevo diseño
    let iconClass = 'info';
    let boxClass = 'info';
    
    switch(type) {
        case 'success':
            iconClass = 'success';
            boxClass = 'success';
            break;
        case 'error':
        case 'danger':
            iconClass = 'danger';
            boxClass = 'danger';
            break;
        case 'warning':
            iconClass = 'warning';
            boxClass = 'warning';
            break;
        default:
            iconClass = 'info';
            boxClass = 'info';
    }
    
    messageDiv.innerHTML = `
        <div class="new-message-box-${boxClass}">
            <div class="info-tab tip-icon-${iconClass}" title="${type}"><i></i></div>
            <div class="tip-box-${boxClass}">
                <p>${message}</p>
            </div>
        </div>
        <button type="button" class="close-flash absolute top-2 right-2 text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    flashContainer.appendChild(messageDiv);
    
    // Configurar el botón de cierre
    const closeButton = messageDiv.querySelector('.close-flash');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 600);
        });
    }
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 600);
    }, 5000);
}

/**
 * Configura animaciones adicionales
 */
function setupAnimations() {
    // Añadir animación al botón de CTA en la sección hero
    const ctaButton = document.querySelector('.hero-section a.bg-blue-600');
    if (ctaButton) {
        ctaButton.classList.add('btn-pulse');
    }
    
    // Añadir animación a los iconos sociales
    const socialIcons = document.querySelectorAll('.fab');
    socialIcons.forEach(icon => {
        if (icon.parentElement) {
            icon.parentElement.classList.add('social-icon');
        }
    });

    // Añadir efecto de shake para los modales
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .shake-effect {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
    `;
    document.head.appendChild(style);
}

// Función para el scroll suave hacia las secciones
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // No prevenir el comportamiento predeterminado para enlaces de modales
            if (href === '#show-register' || href === '#show-login') return;
            
            e.preventDefault();
            
            const target = document.querySelector(href);
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 70, // Ajustado para tener en cuenta el navbar fijo
                    behavior: 'smooth'
                });
            }
        });
    });
});