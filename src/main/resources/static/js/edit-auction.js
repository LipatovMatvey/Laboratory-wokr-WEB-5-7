$(document).ready(function() {
    checkAuth();
    const auctionId = getAuctionIdFromUrl();
    if (auctionId) {
        loadAuctionData(auctionId);
    } else {
        showError('Аукцион не найден');
        setTimeout(() => window.location.href = 'auctions.html', 2000);
    }
    $('#edit-auction-form').on('submit', handleFormSubmit);
    $('#cancel-btn').on('click', cancelEdit);
    $('input, textarea').on('input', function() {
        validateField($(this));
    });
});

/**
 * Получает ID аукциона из URL
 */
function getAuctionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * Проверяет авторизацию пользователя
 */
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showError('Требуется авторизация');
        setTimeout(() => window.location.href = 'auth.html', 2000);
        return;
    }
    const user = JSON.parse(userStr);
    if (!user.authenticated) {
        showError('Требуется авторизация');
        setTimeout(() => window.location.href = 'auth.html', 2000);
        return;
    }
    if (user.role === 'admin') {
        $('#status-section').removeClass('hidden');
    }
}

/**
 * Загружает данные аукциона
 */
function loadAuctionData(auctionId) {
    $.ajax({
        url: `/api/auctions/${auctionId}`,
        method: "GET",
        success: function(auction) {
            populateForm(auction);
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Не удалось загрузить данные аукциона';
            showError(error);
            setTimeout(() => window.location.href = 'auctions.html', 2000);
        }
    });
}

/**
 * Заполняет форму данными аукциона
 */
function populateForm(auction) {
    // Скрываем сообщение о загрузке и показываем форму
    $('#loading-message').addClass('hidden');
    $('#edit-auction-form').removeClass('hidden');    
    $('#title').val(auction.title || '');
    $('#description').val(auction.description || '');
    $('#startPrice').val(auction.startPrice || 0);
    $('#step').val(auction.step || 10);
    $('#category').val(auction.category || 'other');
    $('#creator-name').text(auction.creatorName || 'Неизвестно');
    $('#start-time').text(new Date(auction.startTime).toLocaleString('ru-RU'));
    $('#end-time').text(new Date(auction.endTime).toLocaleString('ru-RU'));
    $('#current-price').text(formatPrice(auction.currentPrice || auction.startPrice || 0) + ' ₽');
    $('#bids-count').text(auction.bidsCount || 0);    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        $('#status').val(auction.status || 'ACTIVE');
    }    
    const now = new Date();
    const startTime = new Date(auction.startTime);
    if (now > startTime) {
        showWarning('Аукцион уже начался. Некоторые изменения могут быть ограничены.');
    }
}

/**
 * Обрабатывает отправку формы
 */
function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
        return;
    }    
    const auctionId = getAuctionIdFromUrl();
    const updates = getFormData();
    saveChanges(auctionId, updates);
}

/**
 * Валидирует форму
 */
function validateForm() {
    let isValid = true;
    $('#edit-auction-form input[required]').each(function() {
        if (!validateField($(this))) {
            isValid = false;
        }
    });    
    const startPrice = parseFloat($('#startPrice').val());
    if (isNaN(startPrice) || startPrice <= 0) {
        showFieldError($('#startPrice'), 'Начальная цена должна быть больше 0');
        isValid = false;
    }
    const step = parseFloat($('#step').val());
    if (isNaN(step) || step < 10) {
        showFieldError($('#step'), 'Минимальный шаг ставки - 10 рублей');
        isValid = false;
    }
    return isValid;
}

/**
 * Валидирует одно поле
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
    }
    return true;
}

/**
 * Получает данные из формы
 */
function getFormData() {
    const updates = {
        title: $('#title').val().trim(),
        description: $('#description').val().trim(),
        startPrice: parseFloat($('#startPrice').val()),
        step: parseFloat($('#step').val()),
        category: $('#category').val()
    };    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        updates.status = $('#status').val();
    }
    return updates;
}

/**
 * Сохраняет изменения на сервере
 */
function saveChanges(auctionId, updates) {
    $('#save-btn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Сохранение...');
    $.ajax({
        url: `/api/auctions/${auctionId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updates),
        success: function(response) {
            showSuccess('Изменения успешно сохранены!');
            setTimeout(() => {
                window.location.href = 'auctions.html';
            }, 1500);
        },
        error: function(xhr) {
            $('#save-btn').prop('disabled', false).html('<i class="bi bi-check-circle me-1"></i>Сохранить изменения');
            const error = xhr.responseJSON?.error || 'Ошибка при сохранении изменений';
            showError(error);
        }
    });
}

/**
 * Отменяет редактирование
 */
function cancelEdit() {
    if (confirm('Все несохраненные изменения будут потеряны. Продолжить?')) {
        window.location.href = 'auctions.html';
    }
}

/**
 * Показывает ошибку поля
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
 */
function clearFieldError($field) {
    $field.removeClass('is-invalid');
    $field.next('.invalid-feedback').remove();
}

/**
 * Форматирует цену
 */
function formatPrice(price) {
    return parseFloat(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Показывает уведомление об ошибке
 */
function showError(message) {
    $('#error-message').text(message);
    $('#errorModal').modal('show');
}

/**
 * Показывает предупреждение
 */
function showWarning(message) {
    $('#edit-auction-form').prepend(`
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
}

/**
 * Показывает уведомление об успехе
 */
function showSuccess(message) {
    $('#edit-auction-form').prepend(`
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="bi bi-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
}