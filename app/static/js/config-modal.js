// Añadir al archivo perfil.js o crear un nuevo archivo config-modal.js e incluirlo
document.addEventListener('DOMContentLoaded', function() {
    // Funcionalidad para el modal de configuración
    initConfigModal();
});

function initConfigModal() {
    const configBtn = document.getElementById('config-btn');
    const configModal = document.getElementById('configModal');
    const closeConfigBtn = document.getElementById('closeConfigModal');
    const cancelConfigBtn = document.getElementById('cancelConfigBtn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const configForm = document.getElementById('configForm');
    
    if (!configBtn || !configModal) return;
    
    // Abrir modal
    configBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openConfigModal();
    });
    
    // Cerrar modal con el botón X
    if (closeConfigBtn) {
        closeConfigBtn.addEventListener('click', closeConfigModal);
    }
    
    // Cerrar modal con el botón Cancelar
    if (cancelConfigBtn) {
        cancelConfigBtn.addEventListener('click', closeConfigModal);
    }
    
    // Cambiar entre tabs y configurar los campos según el tab
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            changeTab(tabName);
            
            // Si el tab es 'profile', configurar campos como deshabilitados
            if (tabName === 'profile') {
                setupProfileFields(configForm);
            } else if (tabName === 'password') {
                setupPasswordFields(configForm);
            }
        });
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    configModal.addEventListener('click', function(event) {
        // Solo si se hace clic fuera del contenido del modal
        if (event.target === configModal) {
            closeConfigModal();
        }
    });
    
    // Prevenir que el clic dentro del contenido del modal cierre el modal
    const modalContent = configModal.querySelector('.bg-white');
    if (modalContent) {
        modalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }
    
    // Configurar campos iniciales al cargar (suponiendo que el tab inicial es 'password')
    if (configForm) {
        setupPasswordFields(configForm);
    }
}

// Configurar campos para el tab de perfil (deshabilitados)
function setupProfileFields(form) {
    // Hacer que los campos parezcan deshabilitados con estilo gris oscuro
    const profileFields = ['nombres', 'apellidos', 'telefono'];
    profileFields.forEach(field => {
        const input = form.querySelector(`#${field}`);
        if (input) {
            // Deshabilitar campos y aplicar estilo gris oscuro
            input.classList.add('bg-gray-200', 'text-gray-600');
            input.setAttribute('readonly', 'readonly');
        }
    });
    
    // Actualizar etiqueta del botón de guardar
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Datos no modificables';
        submitBtn.disabled = true;
        submitBtn.classList.add('bg-gray-500', 'opacity-60', 'cursor-not-allowed');
        submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    }
}

// Configurar campos para el tab de contraseña (habilitados)
function setupPasswordFields(form) {
    // Restaurar campos de contraseña a estado normal
    const passwordFields = ['current_password', 'new_password', 'confirm_password'];
    passwordFields.forEach(field => {
        const input = form.querySelector(`#${field}`);
        if (input) {
            input.classList.remove('bg-gray-200', 'text-gray-600');
            input.removeAttribute('readonly');
        }
    });
    
    // Restaurar botón de guardar
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Guardar Cambios';
        submitBtn.disabled = false;
        submitBtn.classList.remove('bg-gray-500', 'opacity-60', 'cursor-not-allowed');
        submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }
}

function openConfigModal() {
    const configModal = document.getElementById('configModal');
    if (!configModal) return;
    
    // Mostrar el modal
    configModal.classList.remove('hidden');
    
    // Aplicar animación de entrada
    const modalContent = configModal.querySelector('.bg-white');
    if (modalContent) {
        modalContent.style.animation = 'modalSlideIn 0.3s forwards';
    }
    
    // Deshabilitar scroll del body
    document.body.style.overflow = 'hidden';
}

function closeConfigModal() {
    const configModal = document.getElementById('configModal');
    const modalContent = configModal.querySelector('.bg-white');
    
    // Aplicar animación de salida
    if (modalContent) {
        modalContent.style.animation = 'modalSlideOut 0.3s forwards';
        
        // Esperar a que termine la animación para ocultar el modal
        setTimeout(function() {
            configModal.classList.add('hidden');
            // Restaurar scroll del body
            document.body.style.overflow = '';
        }, 300);
    } else {
        configModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function changeTab(tabName) {
    // Ocultar todos los contenidos de tabs con animación
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
        content.style.opacity = '0';
        setTimeout(() => {
            content.classList.add('hidden');
        }, 200);
    });
    
    // Mostrar el contenido del tab seleccionado con animación
    setTimeout(() => {
        const selectedTab = document.getElementById(`tab-${tabName}`);
        if (selectedTab) {
            selectedTab.classList.remove('hidden');
            setTimeout(() => {
                selectedTab.style.opacity = '1';
            }, 50);
        }
        
        // Actualizar estilos de los botones
        const allTabButtons = document.querySelectorAll('.tab-btn');
        allTabButtons.forEach(btn => {
            btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            btn.classList.add('text-gray-500', 'hover:text-gray-700');
        });
        
        // Activar estilo del botón seleccionado con animación
        const selectedButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (selectedButton) {
            selectedButton.classList.remove('text-gray-500', 'hover:text-gray-700');
            selectedButton.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        }
    }, 200);
}

function validateConfigForm() {
    const form = document.getElementById('configForm');
    if (!form) return true;
    
    // Verificar en qué tab estamos para saber qué validar
    const passwordTabVisible = !document.getElementById('tab-password').classList.contains('hidden');
    
    // Si estamos en el tab de perfil, no validamos ya que los campos están deshabilitados
    if (!passwordTabVisible) {
        // Esto en realidad no debería suceder porque el botón estará deshabilitado
        // pero lo agregamos como medida de seguridad
        showFormError('La información del perfil no se puede modificar');
        return false;
    }
    
    // Validación para el tab de contraseña
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    // Validar contraseña actual
    if (!currentPassword) {
        showFormError('Por favor ingrese su contraseña actual');
        return false;
    }
    
    // Validar contraseñas nuevas
    if (!newPassword || !confirmPassword) {
        showFormError('Por favor complete todos los campos de contraseña');
        return false;
    }
    
    if (newPassword !== confirmPassword) {
        showFormError('Las nuevas contraseñas no coinciden');
        return false;
    }
    
    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
        showFormError('La nueva contraseña debe tener al menos 8 caracteres y contener al menos un número');
        return false;
    }
    
    return true;
}
function showFormError(message) {
    // Crear un elemento para mostrar el error
    const errorElement = document.createElement('div');
    errorElement.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4';
    errorElement.innerHTML = `<p>${message}</p>`;
    
    // Insertar al inicio del formulario
    const form = document.getElementById('configForm');
    form.insertBefore(errorElement, form.firstChild);
    
    // Quitar el mensaje después de 5 segundos
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 5000);
}

// Añadir estilos para las animaciones del modal
const styleElement = document.createElement('style');
styleElement.textContent = `
    @keyframes modalSlideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes modalSlideOut {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-50px); opacity: 0; }
    }
    
    /* Transiciones suaves para los tabs */
    .tab-content {
        transition: opacity 0.3s ease;
    }
    
    .tab-content.hidden {
        display: none;
    }
    
    /* Estilos adicionales para focus */
    input:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }
`;
document.head.appendChild(styleElement);

// Agregar validación al formulario antes de enviar
const configForm = document.getElementById('configForm');
if (configForm) {
    configForm.addEventListener('submit', function(event) {
        if (!validateConfigForm()) {
            event.preventDefault();
        }
    });
}