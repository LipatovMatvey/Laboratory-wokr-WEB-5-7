
$(document).ready(function() {
    initializeForm();
    setupEventListeners();
});

/**
 * Инициализирует форму создания аукциона
 */
function initializeForm() {
    // Устанавливаем минимальное время (текущее + 1 час)
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const minDateTime = now.toISOString().slice(0, 16);
    
    $('#startTime').attr('min', minDateTime);
    $('#endTime').attr('min', minDateTime);
    
    // Предустановка времени (начало: через 2 часа, окончание: через 24 часа)
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 2);
    $('#startTime').val(startTime.toISOString().slice(0, 16));
    
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);
    $('#endTime').val(endTime.toISOString().slice(0, 16));
}

/**
 * Настраивает обработчики событий
 */
function setupEventListeners() {
    // Предпросмотр изображения
    $('#image').on('change', handleImagePreview);
    
    // Удаление изображения
    $('#remove-image-btn').on('click', removeImage);
    
    // Отмена создания
    $('#cancel-btn').on('click', cancelCreation);
    
    // Обработка отправки формы
    $('#create-auction-form').on('submit', handleFormSubmit);
    
    // Валидация полей при изменении
    $('input, textarea, select').on('input change', function() {
        validateField($(this));
    });
}

/**
 * Обрабатывает предпросмотр загруженного изображения
 */
function handleImagePreview(e) {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        // Проверка размера файла (максимум 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('Размер файла не должен превышать 5MB');
            $('#image').val('');
            return;
        }
        
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            showError('Пожалуйста, выберите файл изображения (JPG, PNG)');
            $('#image').val('');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            $('#image-preview').attr('src', e.target.result);
            $('#remove-image-btn').show();
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Удаляет выбранное изображение
 */
function removeImage() {
    $('#image').val('');
    $('#image-preview').attr('src', 'https://via.placeholder.com/300x200?text=Предпросмотр');
    $('#remove-image-btn').hide();
}

/**
 * Отменяет создание аукциона
 */
function cancelCreation() {
    if (confirm('Вы уверены, что хотите отменить создание аукциона? Все несохраненные данные будут потеряны.')) {
        window.history.back();
    }
}

/**
 * Обрабатывает отправку формы
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    if (validateForm()) {
        createAuction();
    }
}

/**
 * Валидирует форму
 * @returns {boolean} true если форма валидна
 */
function validateForm() {
    let isValid = true;
    
    // Проверяем все обязательные поля
    $('#create-auction-form input[required], #create-auction-form select[required]').each(function() {
        if (!validateField($(this))) {
            isValid = false;
        }
    });
    
    // Дополнительная валидация цен
    const startPrice = parseFloat($('#startPrice').val());
    const step = parseFloat($('#step').val());
    
    if (startPrice <= 0) {
        showFieldError($('#startPrice'), 'Начальная цена должна быть больше 0');
        isValid = false;
    }
    
    if (step < 10) {
        showFieldError($('#step'), 'Минимальный шаг ставки - 10 рублей');
        isValid = false;
    }
    
    // Валидация дат
    const startTime = new Date($('#startTime').val());
    const endTime = new Date($('#endTime').val());
    
    if (endTime <= startTime) {
        showFieldError($('#endTime'), 'Время окончания должно быть позже времени начала');
        isValid = false;
    }
    
    if (startTime < new Date()) {
        showFieldError($('#startTime'), 'Время начала не может быть в прошлом');
        isValid = false;
    }
    
    // Минимальная длительность аукциона - 1 час
    const minDuration = 60 * 60 * 1000; // 1 час в миллисекундах
    if ((endTime - startTime) < minDuration) {
        showFieldError($('#endTime'), 'Минимальная длительность аукциона - 1 час');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Валидирует одно поле формы
 * @param {jQuery} $field - jQuery объект поля
 * @returns {boolean} true если поле валидно
 */
function validateField($field) {
    const value = $field.val();
    const fieldId = $field.attr('id');
    
    // Очищаем предыдущие ошибки
    clearFieldError($field);
    
    // Проверка обязательных полей
    if ($field.prop('required') && !value.trim()) {
        showFieldError($field, 'Это поле обязательно для заполнения');
        return false;
    }
    
    // Специфичная валидация для разных типов полей
    switch(fieldId) {
        case 'title':
            if (value.length < 5) {
                showFieldError($field, 'Название должно содержать минимум 5 символов');
                return false;
            }
            break;
            
        case 'startPrice':
        case 'step':
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                showFieldError($field, 'Введите корректное число');
                return false;
            }
            break;
            
        case 'email':
            if (!isValidEmail(value)) {
                showFieldError($field, 'Введите корректный email адрес');
                return false;
            }
            break;
    }
    
    return true;
}

/**
 * Показывает ошибку для поля
 * @param {jQuery} $field - jQuery объект поля
 * @param {string} message - Сообщение об ошибке
 */
function showFieldError($field, message) {
    $field.addClass('is-invalid');
    let $feedback = $field.next('.invalid-feedback');
    
    if ($feedback.length === 0) {
        $feedback = $(`<div class="invalid-feedback">${message}</div>`);
        $field.after($feedback);
    } else {
        $feedback.text(message);
    }
}

/**
 * Очищает ошибку поля
 * @param {jQuery} $field - jQuery объект поля
 */
function clearFieldError($field) {
    $field.removeClass('is-invalid');
    $field.next('.invalid-feedback').remove();
}

/**
 * Проверяет валидность email
 * @param {string} email - Email для проверки
 * @returns {boolean} true если email валиден
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Создает аукцион на сервере
 */
function createAuction() {
    const formData = new FormData();
    
    // Логирование для отладки
    console.log('Данные формы:');
    console.log('Название:', $('#title').val());
    console.log('Файл:', $('#image')[0].files[0]);
    
    formData.append('title', $('#title').val().trim());
    formData.append('description', $('#description').val().trim());
    formData.append('startPrice', $('#startPrice').val());
    formData.append('step', $('#step').val());
    
    // ИСПРАВЛЕНО: Используем ISO формат без дополнительного добавления секунд
    const startTime = $('#startTime').val();
    const endTime = $('#endTime').val();
    
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);
    formData.append('category', $('#category').val());
    
    const imageFile = $('#image')[0].files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const $submitBtn = $('#submit-btn');
    const originalText = $submitBtn.text();
    $submitBtn.prop('disabled', true).text('Создание...');
    
    // Показываем индикатор загрузки
    $('body').append('<div class="loading-overlay"></div>');
    
    $.ajax({
        url: '/api/auctions/create',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        beforeSend: function() {
            console.log('Отправка запроса на сервер...');
        },
        success: function(response) {
            console.log('Успешный ответ:', response);
            showSuccess('✅ Аукцион успешно создан!');

            // Задержка перед перенаправлением
            setTimeout(function() {
                window.location.href = 'user-cabinet.html';
            }, 1500);
        },
        error: function(xhr, status, error) {
            console.error('Ошибка запроса:', {
                status: xhr.status,
                statusText: xhr.statusText,
                error: error,
                responseText: xhr.responseText
            });
            
            const response = xhr.responseJSON;
            const errorMessage = response?.error || 'Не удалось создать аукцион. Попробуйте позже.';
            showError('❌ ' + errorMessage);
            
            // Если ошибка авторизации - перенаправляем на страницу входа
            if (xhr.status === 401) {
                setTimeout(function() {
                    window.location.href = 'auth.html';
                }, 2000);
            }
        },
        complete: function() {
            $submitBtn.prop('disabled', false).text(originalText);
            $('.loading-overlay').remove();
        }
    });
}

/**
 * Показывает уведомление об ошибке
 * @param {string} message - Сообщение об ошибке
 */
function showError(message) {
    $('#error-message').text(message);
    const errorToast = new bootstrap.Toast(document.getElementById('error-toast'));
    $('#error-toast').show();
    errorToast.show();
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(function() {
        errorToast.hide();
    }, 5000);
}

/**
 * Показывает уведомление об успехе
 * @param {string} message - Сообщение об успехе
 */
function showSuccess(message) {
    $('#success-message').text(message);
    const successToast = new bootstrap.Toast(document.getElementById('success-toast'));
    $('#success-toast').show();
    successToast.show();
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(function() {
        successToast.hide();
    }, 3000);
}

/**
 * Стили для индикатора загрузки (добавляются динамически)
 */
$(document).ready(function() {
    // Добавляем стили для индикатора загрузки
    $('head').append(`
        <style>
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.8);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .loading-overlay::after {
                content: '';
                width: 50px;
                height: 50px;
                border: 5px solid #f3f3f3;
                border-top: 5px solid #0d6efd;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `);
});
