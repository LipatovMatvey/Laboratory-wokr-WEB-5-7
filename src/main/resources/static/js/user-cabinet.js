$(document).ready(function() {
    console.log('=== user-cabinet.js загружен ===');
    let pendingAvatarFile = null;
    let originalAvatarUrl = null;
    checkAuth();
    $('#logout-btn').on('click', function() {
        logout();
    });
    loadUserData();
    loadUserBalance();
    $('#user-data-form').on('submit', function(e) {
        e.preventDefault();
        updateUserData();
    });
    $('#avatar-upload').on('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            previewAvatar(file);
        }
    });
    $(document).on('click', '#remove-avatar-btn', function() {
        removeAvatarPreview();
    });
    $(document).on('click', '#add-balance-btn', function(e) {
        e.preventDefault();
        console.log('=== Кнопка "Пополнить баланс" нажата ===');
        console.log('Кнопка:', this);
        console.log('Событие:', e);
        addFixedBalance();
    });
    loadUserBids();
    loadWonLots();
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
 * Загружает текущий баланс пользователя с сервера.
 */
function loadUserBalance() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.log('Пользователь не найден в localStorage');
        return;
    }
    console.log('Загрузка баланса...');
    $.ajax({
        url: "/api/balance",
        method: "GET",
        success: function(response) {
            console.log('Баланс загружен:', response.balance);
            updateBalanceDisplay(response.balance);
            const user = JSON.parse(userStr);
            user.balance = response.balance;
            localStorage.setItem('user', JSON.stringify(user));
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке баланса:', xhr.responseJSON);
            const user = JSON.parse(userStr);
            if (user.balance !== undefined) {
                updateBalanceDisplay(user.balance);
            } else {
                $('#user-balance').text('Ошибка загрузки');
            }
        }
    });
}

/**
 * Обновляет отображение баланса на странице.
 * @param {number} balance - Сумма баланса
 */
function updateBalanceDisplay(balance) {
    const formattedBalance = balance.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    $('#user-balance').text(formattedBalance);
}

/**
 * Пополняет баланс на фиксированную сумму (10,000 рублей).
 */
function addFixedBalance() {
    console.log('=== addFixedBalance вызвана ===');
    if (typeof $ === 'undefined') {
        console.error('jQuery не загружен!');
        return;
    }
    const $button = $('#add-balance-btn');
    if ($button.length === 0) {
        console.error('Кнопка #add-balance-btn не найдена!');
        return;
    }
    console.log('Кнопка найдена, текст:', $button.text());
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.error('Пользователь не найден в localStorage');
        alert('Ошибка: пользователь не авторизован');
        return;
    }
    const user = JSON.parse(userStr);
    console.log('Данные пользователя:', user);
    if (!user.authenticated) {
        alert('Ошибка: пользователь не авторизован');
        return;
    }
    if (!confirm('Вы уверены, что хотите пополнить баланс на 10,000 ₽?')) {
        return;
    }
    const originalText = $button.html();
    $button.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Пополнение...');
    console.log('Отправка POST запроса на /api/balance/add-fixed');
    $.ajax({
        url: "/api/balance/add-fixed",
        method: "POST",
        dataType: "json",
        success: function(response) {
            console.log('Успешный ответ сервера:', response);
            if (response && response.newBalance !== undefined) {
                updateBalanceDisplay(response.newBalance);
                user.balance = response.newBalance;
                localStorage.setItem('user', JSON.stringify(user));
                alert(`✅ Баланс успешно пополнен!\nНовый баланс: ${response.newBalance.toLocaleString('ru-RU')} ₽`);
            } else {
                alert('Ошибка: некорректный ответ от сервера');
            }
        },
        error: function(xhr, status, error) {
            console.error('Ошибка AJAX:', {
                status: status,
                error: error,
                response: xhr.responseText,
                readyState: xhr.readyState,
                statusText: xhr.statusText
            });
            
            let errorMessage = 'Не удалось пополнить баланс';
            try {
                const response = JSON.parse(xhr.responseText);
                if (response && response.error) {
                    errorMessage = response.error;
                }
            } catch (e) {
                errorMessage = xhr.statusText || 'Сервер недоступен';
            }
            alert(`❌ ${errorMessage}`);
        },
        complete: function() {
            $button.prop('disabled', false).html(originalText);
        }
    });
}

/**
 * Показывает уведомление пользователю в правом верхнем углу.
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления (success, danger, warning, info)
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
        $notification.alert('close');
    }, 3000);
}

/**
 * Проверяет авторизацию пользователя через серверный эндпоинт.
 * Перенаправляет на страницу авторизации при отсутствии доступа.
 */
function checkAuth() {
    $.ajax({
        url: "/auth/whoAmI",
        method: "GET",
        success: function(response) {
            updateNavigation(response);
            if (response.authenticated && response.role === 'admin') {
                $('#admin-tab').show();
                if (typeof initAdminPanel === 'function') {
                    initAdminPanel();
                }
            }
        },
        error: function(xhr, status, error) {
            window.location.href = 'auth.html';
        }
    });
}

/**
 * Обновляет навигационную панель на основе данных пользователя.
 * Скрывает/показывает элементы интерфейса в зависимости от роли.
 * @param {object} response - Данные пользователя с сервера
 */
function updateNavigation(response) {
    if (response.authenticated) {
        $('#user-info').text(response.fullName || 'Пользователь');
        $('#user-role').text(getRoleDisplayName(response.role));
        $('#login-item').addClass('hidden');
        $('#logout-item').removeClass('hidden');
        $('#user-cabinet-item').removeClass('hidden');
        const userData = {
            authenticated: true,
            id: response.id,
            fullName: response.fullName,
            email: response.email,
            birthdate: response.birthdate,
            role: response.role,
            avatarUrl: response.avatarUrl
        };
        localStorage.setItem('user', JSON.stringify(userData));
        if (response.role === 'admin') {
            $('#admin-tab').show();
            $('#admin-panel-item').addClass('hidden');
        } else {
            $('#admin-tab').hide();
            $('#admin-panel-item').addClass('hidden');
        }
    } else {
        window.location.href = 'auth.html';
    }
}

/**
 * Конвертирует код роли в читаемое название.
 * @param {string} role - Код роли (admin, moder, user)
 * @returns {string} Отображаемое название роли
 */
function getRoleDisplayName(role) {
    switch(role) {
        case 'admin': return 'Администратор';
        case 'moder': return 'Модератор';
        case 'user': return 'Пользователь';
        default: return 'Гость';
    }
}

/**
 * Выполняет выход пользователя из системы.
 * Очищает localStorage и перенаправляет на главную страницу.
 */
function logout() {
    $.ajax({
        url: "/auth/logout",
        method: "POST",
        success: function() {
            localStorage.removeItem('user');
            window.location.href = 'main.html';
        },
        error: function() {
            localStorage.removeItem('user');
            window.location.href = 'main.html';
        }
    });
}

/**
 * Загружает данные пользователя из localStorage и с сервера.
 * Заполняет форму профиля и обновляет навигацию.
 */
function loadUserData() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'auth.html';
        return;
    }
    const user = JSON.parse(userStr);
    if (!user.authenticated) {
        window.location.href = 'auth.html';
        return;
    }
    $('#user-name').val(user.fullName || '');
    $('#user-email').val(user.email || '');
    $('#user-birthdate').val(user.birthdate || '');
    $('#display-role').text(getRoleDisplayName(user.role) || 'Пользователь');
    originalAvatarUrl = user.avatarUrl || '/uploads/avatars/img.png';
    $('#user-avatar-preview').attr('src', originalAvatarUrl);
    pendingAvatarFile = null;
    $('#avatar-file-info').hide();
    $('#remove-avatar-btn').hide();
    $('#avatar-upload').val('');
    if (user.balance !== undefined) {
        updateBalanceDisplay(user.balance);
    }
    $.ajax({
        url: `/api/users/${user.id}`,
        method: "GET",
        success: function(userData) {
            $('#user-name').val(userData.fullName || '');
            $('#user-email').val(userData.email || '');
            $('#user-birthdate').val(userData.birthDate || '');
            if (userData.balance !== undefined) {
                updateBalanceDisplay(userData.balance);
                user.balance = userData.balance; // Обновляем в объекте пользователя
                localStorage.setItem('user', JSON.stringify(user)); // Сохраняем в localStorage
            }
            if (userData.avatarPath) {
                $('#user-avatar-preview').attr('src', userData.avatarPath);
                originalAvatarUrl = userData.avatarPath;
            } else {
                $('#user-avatar-preview').attr('src', '/uploads/avatars/img.png');
                originalAvatarUrl = '/uploads/avatars/img.png';
            }
            user.fullName = userData.fullName;
            user.email = userData.email;
            user.birthdate = userData.birthDate;
            localStorage.setItem('user', JSON.stringify(user));
            $('#user-info').text(userData.fullName || 'Пользователь');
        },
        error: function(xhr) {
            showUserNotification('Не удалось загрузить актуальные данные с сервера. Показаны данные из кэша.', 'warning');
        }
    });
}

/**
 * Предпросмотр аватара без сохранения на сервер.
 * @param {File} file - Файл изображения для предпросмотра
 */
function previewAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showUserNotification('Пожалуйста, выберите файл изображения (JPG, PNG, GIF)', 'warning');
        $('#avatar-upload').val('');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showUserNotification('Размер файла не должен превышать 5MB', 'warning');
        $('#avatar-upload').val('');
        return;
    }
    pendingAvatarFile = file;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    $('#avatar-file-info').html(`
        Выбран файл: ${file.name}<br>
        Размер: ${fileSizeMB} MB
    `).show();
    const reader = new FileReader();
    reader.onload = function(e) {
        $('#user-avatar-preview').attr('src', e.target.result);
    };
    reader.readAsDataURL(file);
    $('#remove-avatar-btn').show();
    showUserNotification('Фото загружено для предпросмотра. Нажмите "Сохранить изменения" для применения.', 'info');
}

/**
 * Удаляет предпросмотр аватара и сбрасывает состояние.
 */
function removeAvatarPreview() {
    $('#user-avatar-preview').attr('src', originalAvatarUrl);
    pendingAvatarFile = null;
    $('#avatar-upload').val('');
    $('#avatar-file-info').hide();
    $('#remove-avatar-btn').hide();
    showUserNotification('Изменения фото отменены. Нажмите "Сохранить изменения" для применения.', 'info');
}

/**
 * Обновляет данные пользователя на сервере.
 * Валидирует форму, отправляет данные и обрабатывает ответ.
 */
function updateUserData() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showUserNotification('Ошибка: пользователь не авторизован', 'danger');
        window.location.href = 'auth.html';
        return;
    }
    const user = JSON.parse(userStr);
    const userData = {
        fullName: $('#user-name').val().trim(),
        email: $('#user-email').val().trim(),
        birthDate: $('#user-birthdate').val() || '',
        preserveVisits: true
    };
    if (!userData.fullName) {
        showUserNotification('Пожалуйста, введите имя', 'warning');
        $('#user-name').focus();
        return;
    }
    if (!userData.email) {
        showUserNotification('Пожалуйста, введите email', 'warning');
        $('#user-email').focus();
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        showUserNotification('Пожалуйста, введите корректный email адрес', 'warning');
        $('#user-email').focus();
        return;
    }
    const $submitBtn = $('#user-data-form button[type="submit"]');
    const originalText = $submitBtn.text();
    $submitBtn.prop('disabled', true).text('Сохранение...');
    $('.user-notification').remove();
    if (pendingAvatarFile) {
        uploadAvatarWithUserData(user, userData, $submitBtn, originalText);
    } else {
        updateUserDataOnly(user, userData, $submitBtn, originalText);
    }
}

/**
 * Загружает аватар вместе с обновлением данных пользователя.
 * @param {object} user - Объект пользователя из localStorage
 * @param {object} userData - Данные для обновления
 * @param {jQuery} $submitBtn - Кнопка отправки
 * @param {string} originalText - Оригинальный текст кнопки
 */
function uploadAvatarWithUserData(user, userData, $submitBtn, originalText) {
    const formData = new FormData();
    formData.append('avatar', pendingAvatarFile);
    $.ajax({
        url: `/api/users/${user.id}/avatar`,
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function(avatarResponse) {
            userData.avatarPath = avatarResponse.avatarUrl;
            updateUserDataOnly(user, userData, $submitBtn, originalText, true);
        },
        error: function(xhr) {
            $submitBtn.prop('disabled', false).text(originalText);
            const response = xhr.responseJSON;
            showUserNotification('❌ Ошибка при загрузке фото: ' + (response?.error || 'Не удалось загрузить аватар'), 'danger');
        }
    });
}

/**
 * Обновляет только данные пользователя (без аватара).
 * @param {object} user - Объект пользователя из localStorage
 * @param {object} userData - Данные для обновления
 * @param {jQuery} $submitBtn - Кнопка отправки
 * @param {string} originalText - Оригинальный текст кнопки
 * @param {boolean} avatarUpdated - Флаг обновления аватара
 */
function updateUserDataOnly(user, userData, $submitBtn, originalText, avatarUpdated = false) {
    $.ajax({
        url: `/api/users/${user.id}`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify(userData),
        success: function(updatedUser) {
            user.fullName = updatedUser.fullName;
            user.email = updatedUser.email;
            user.birthdate = updatedUser.birthDate;
            if (avatarUpdated && updatedUser.avatarPath) {
                user.avatarUrl = updatedUser.avatarPath;
                originalAvatarUrl = updatedUser.avatarPath;
            }
            localStorage.setItem('user', JSON.stringify(user));
            $('#user-info').text(updatedUser.fullName);
            $('#user-avatar-preview').attr('src', user.avatarUrl || '/uploads/avatars/img.png');
            pendingAvatarFile = null;
            $('#avatar-file-info').hide();
            $('#remove-avatar-btn').hide();
            $('#avatar-upload').val('');
            showUserNotification('✅ Данные успешно обновлены!' + (avatarUpdated ? ' Фото сохранено.' : ''), 'success');
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            showUserNotification('❌ Ошибка: ' + (response?.error || 'Не удалось обновить данные'), 'danger');
        },
        complete: function() {
            $submitBtn.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Загружает историю ставок пользователя с сервера.
 */
function loadUserBids() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    $.ajax({
        url: `/api/users/${user.id}/bids`,
        method: "GET",
        success: function(bids) {
            renderUserBids(bids);
        },
        error: function(xhr) {
            $('#user-bids').html('<p class="text-muted">У вас пока нет ставок</p>');
        }
    });
}

/**
 * Рендерит список ставок пользователя.
 * @param {Array} bids - Массив ставок пользователя
 */
function renderUserBids(bids) {
    const $container = $('#user-bids');
    if (!bids || bids.length === 0) {
        $container.html('<p class="text-muted">У вас пока нет ставок</p>');
        return;
    }
    let html = '';
    bids.forEach(bid => {
        const statusClass = bid.isWinning ? 'text-success' : 'text-secondary';
        const statusText = bid.isWinning ? 'Лидирующая' : 'Перебита';
        html += `
            <div class="bid-item mb-3 pb-2 border-bottom">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${bid.auctionTitle}</h6>
                        <small class="text-muted">${new Date(bid.createdAt).toLocaleString('ru-RU')}</small>
                    </div>
                    <div class="text-end">
                        <strong class="d-block">${bid.amount.toLocaleString()} ₽</strong>
                        <small class="${statusClass}">${statusText}</small>
                    </div>
                </div>
            </div>
        `;
    });
    $container.html(html);
}

/**
 * Загружает список выигранных лотов пользователя.
 */
function loadWonLots() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    $.ajax({
        url: `/api/users/${user.id}/won-lots`,
        method: "GET",
        success: function(wonLots) {
            renderWonLots(wonLots);
        },
        error: function(xhr) {
            $('#won-lots').html('<p class="text-muted">У вас пока нет выигранных лотов</p>');
        }
    });
}

/**
 * Рендерит список выигранных лотов пользователя.
 * @param {Array} wonLots - Массив выигранных лотов
 */
function renderWonLots(wonLots) {
    const $container = $('#won-lots');
    if (!wonLots || wonLots.length === 0) {
        $container.html('<p class="text-muted">У вас пока нет выигранных лотов</p>');
        return;
    }
    let html = '';
    wonLots.forEach(lot => {
        html += `
            <div class="won-lot-item mb-3 pb-2 border-bottom">
                <h6 class="mb-1">${lot.title}</h6>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">Выиграна: ${new Date(lot.winDate).toLocaleDateString('ru-RU')}</small>
                    <strong class="text-success">${lot.finalPrice.toLocaleString()} ₽</strong>
                </div>
            </div>
        `;
    });
    $container.html(html);
}