$(document).ready(function() {
    checkAuth();
    const auctionId = getAuctionIdFromUrl();
    if (auctionId) {
        loadAuctionData(auctionId);
    } else {
        showUserNotification('Аукцион не найден', 'danger');
        setTimeout(() => window.location.href = 'auctions.html', 2000);
    }
    $('#edit-auction-form').on('submit', handleFormSubmit);
    $('#cancel-btn').on('click', cancelEdit);
    $('input, textarea').on('input', function() {
        validateField($(this));
    });
});

/**
 * Получает ID аукциона из параметров URL
 * @returns {string|null} ID аукциона или null, если не найден
 */
function getAuctionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * Проверяет авторизацию пользователя и права доступа
 * @returns {void}
 */
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showUserNotification('Требуется авторизация', 'warning');
        setTimeout(() => window.location.href = 'auth.html', 2000);
        return;
    }
    const user = JSON.parse(userStr);
    if (!user.authenticated) {
        showUserNotification('Требуется авторизация', 'warning');
        setTimeout(() => window.location.href = 'auth.html', 2000);
        return;
    }
    if (user.role === 'admin') {
        $('#status-section').removeClass('hidden');
    }
}

/**
 * Загружает данные аукциона с сервера
 * @param {string} auctionId - ID аукциона
 * @returns {void}
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
            showUserNotification(error, 'danger');
            setTimeout(() => window.location.href = 'auctions.html', 2000);
        }
    });
}

/**
 * Заполняет форму данными аукциона
 * @param {Object} auction - Объект аукциона
 * @returns {void}
 */
function populateForm(auction) {
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
        showUserNotification('Аукцион уже начался. Некоторые изменения могут быть ограничены.', 'warning');
    }
}

/**
 * Обрабатывает отправку формы редактирования
 * @param {Event} e - Событие отправки формы
 * @returns {void}
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
 * Валидирует все поля формы
 * @returns {boolean} true если форма валидна, false если есть ошибки
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
 * Валидирует одно поле формы
 * @param {jQuery} $field - jQuery объект поля для валидации
 * @returns {boolean} true если поле валидно, false если есть ошибки
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
 * Собирает данные из формы для отправки на сервер
 * @returns {Object} Объект с обновленными данными аукциона
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
 * Сохраняет изменения аукциона на сервере
 * @param {string} auctionId - ID аукциона
 * @param {Object} updates - Объект с обновленными данными
 * @returns {void}
 */
function saveChanges(auctionId, updates) {
    $('#save-btn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Сохранение...');
    $.ajax({
        url: `/api/auctions/${auctionId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updates),
        success: function(response) {
            showUserNotification('✅ Изменения успешно сохранены!', 'success');
            setTimeout(() => {
                window.location.href = 'auctions.html';
            }, 1500);
        },
        error: function(xhr) {
            $('#save-btn').prop('disabled', false).html('<i class="bi bi-check-circle me-1"></i>Сохранить изменения');
            const error = xhr.responseJSON?.error || 'Ошибка при сохранении изменений';
            showUserNotification('❌ ' + error, 'danger');
        }
    });
}

/**
 * Отменяет редактирование аукциона
 * @returns {void}
 */
function cancelEdit() {
    showSimpleConfirmDialog(
        'Отмена редактирования',
        'Все несохраненные изменения будут потеряны. Продолжить?',
        function() {
            window.location.href = 'auctions.html';
        }
    );
}

/**
 * Показывает ошибку для конкретного поля формы
 * @param {jQuery} $field - jQuery объект поля
 * @param {string} message - Сообщение об ошибке
 * @returns {void}
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
 * Очищает ошибку у поля формы
 * @param {jQuery} $field - jQuery объект поля
 * @returns {void}
 */
function clearFieldError($field) {
    $field.removeClass('is-invalid');
    $field.next('.invalid-feedback').remove();
}

/**
 * Форматирует числовое значение цены в строку с разделителями
 * @param {number} price - Цена для форматирования
 * @returns {string} Отформатированная цена
 */
function formatPrice(price) {
    return parseFloat(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Показывает уведомление пользователю в правом верхнем углу.
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления (success, danger, warning, info)
 * @returns {void}
 */
function showUserNotification(message, type = 'info') {
    $('.user-notification').remove();
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'danger' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    const $notification = $(`
        <div class="alert ${alertClass} alert-dismissible fade show user-notification" role="alert" 
             style="position: fixed; top: 80px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('body').append($notification);
    setTimeout(() => {
        $notification.fadeOut(300, function () {
            $(this).remove();
        });
    }, 3000);
}

/**
 * Показывает диалог подтверждения с использованием Bootstrap Modal
 * @param {string} title - Заголовок диалога
 * @param {string} message - Сообщение для отображения
 * @param {function} onConfirm - Функция обратного вызова при подтверждении
 * @returns {void}
 */
function showConfirmDialog(title, message, onConfirm) {
    $('#confirmModal').remove();
    $('.modal-backdrop').remove();
    const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmModalLabel">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="confirmOkBtn">Подтвердить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHtml);
    const modalElement = document.getElementById('confirmModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();    
    $('#confirmOkBtn').off('click').on('click', function() {
        modal.hide();
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    });    
    modalElement.addEventListener('hidden.bs.modal', function () {
        $(this).remove();
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open');
        $('body').css('padding-right', '');
    });
}

/**
 * Показывает упрощенный диалог подтверждения с желтым заголовком
 * @param {string} title - Заголовок диалога
 * @param {string} message - Сообщение для отображения
 * @param {function} onConfirm - Функция обратного вызова при подтверждении
 * @returns {void}
 */
function showSimpleConfirmDialog(title, message, onConfirm) {
    if ($('#simpleConfirmModal').length) {
        $('#simpleConfirmModal').remove();
    }
    const modalHtml = `
        <div class="modal fade" id="simpleConfirmModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title text-white">${title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-warning" id="simpleConfirmBtn">Да, продолжить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('simpleConfirmModal'));
    modal.show();
    $('#simpleConfirmBtn').off('click').on('click', function() {
        modal.hide();
        setTimeout(() => {
            $('#simpleConfirmModal').remove();
            $('.modal-backdrop').remove();
            if (onConfirm && typeof onConfirm === 'function') {
                onConfirm();
            }
        }, 300);
    });
    $('#simpleConfirmModal').on('hidden.bs.modal', function() {
        $(this).remove();
        $('.modal-backdrop').remove();
    });
}