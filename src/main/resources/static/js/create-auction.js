$(document).ready(function() {
    initializeForm();
    setupEventListeners();
});

/**
 * Запрашивает у сервера текущее московское время
 * и отображает его в элементе #server-time.
 * @returns {undefined}
 */
function updateServerTime() {
    $.ajax({
        url: "/api/time",
        method: "GET",
        success: function (data) {
            $("#server-time").text("Точное московское время: " + data.time);
        }
    });
}
setInterval(updateServerTime, 1000);
updateServerTime();

/**
 * Инициализирует форму создания аукциона
 */
function initializeForm() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const minDateTime = now.toISOString().slice(0, 16);
    $('#startTime').attr('min', minDateTime);
    $('#endTime').attr('min', minDateTime);
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
    $('#image').on('change', handleImagePreview);
    $('#remove-image-btn').on('click', removeImage);
    $('#cancel-btn').on('click', cancelCreation);
    $('#create-auction-form').on('submit', handleFormSubmit);
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
        if (file.size > 5 * 1024 * 1024) {
            showError('Размер файла не должен превышать 5MB');
            $('#image').val('');
            return;
        }
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
    $('#create-auction-form input[required], #create-auction-form select[required]').each(function() {
        if (!validateField($(this))) {
            isValid = false;
        }
    });
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
    const minDuration = 60 * 60 * 1000;
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
    clearFieldError($field);
    if ($field.prop('required') && !value.trim()) {
        showFieldError($field, 'Это поле обязательно для заполнения');
        return false;
    }
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
    console.log('Данные формы:');
    console.log('Название:', $('#title').val());
    console.log('Файл:', $('#image')[0].files[0]);
    formData.append('title', $('#title').val().trim());
    formData.append('description', $('#description').val().trim());
    formData.append('startPrice', $('#startPrice').val());
    formData.append('step', $('#step').val());
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
    setTimeout(function() {
        successToast.hide();
    }, 3000);
}

/**
 * Стили для индикатора загрузки (добавляются динамически)
 */
$(document).ready(function() {
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
