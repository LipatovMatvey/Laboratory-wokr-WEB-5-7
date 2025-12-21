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
    const $button = $('#add-balance-btn');
    if ($button.length === 0) {
        console.error('Кнопка #add-balance-btn не найдена!');
        return;
    }
    console.log('Кнопка найдена, текст:', $button.text());
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        console.error('Пользователь не найден в localStorage');
        message = 'Ошибка: пользователь не авторизован';
        showUserNotification(message, "warning");
        return;
    }
    const user = JSON.parse(userStr);
    console.log('Данные пользователя:', user);
    if (!user.authenticated) {
        message = 'Ошибка: пользователь не авторизован';
        showUserNotification(message, "warning");
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
                message = "✅ Баланс успешно пополнен!\nНовый баланс: " + `${response.newBalance.toLocaleString('ru-RU')}` + "₽";
                showUserNotification(message);
            } else {
                message = 'Ошибка: некорректный ответ от сервера';
                showUserNotification(message, "danger");
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
            message = `❌ ${errorMessage}`;
            showUserNotification(message, "warning");
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
        $('#user-visits').text("Количество посещений " + `${response.visits || 0}`);
        $('#login-item').addClass('hidden');
        $('#logout-item').removeClass('hidden');
        $('#user-cabinet-item').removeClass('hidden');
        const userData = {
            authenticated: true,
            id: response.id,
            fullName: response.fullName,
            email: response.email,
            visits: response.visits,
            birthdate: response.birthdate,
            role: response.role,
            avatarUrl: response.avatarUrl,
            balance: response.balance || 0
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
                user.balance = userData.balance;
                localStorage.setItem('user', JSON.stringify(user));
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
    console.log('Загрузка ставок для пользователя:', user.id);
    $.ajax({
        url: `/api/users/${user.id}/bids`,
        method: "GET",
        success: function(bids) {
            console.log('Ставки загружены:', bids);
            renderUserBids(bids);
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке ставок:', xhr.responseJSON);
            $('#user-bids').html(`
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Не удалось загрузить историю ставок
                    <button onclick="loadUserBids()" class="btn btn-sm btn-outline-secondary mt-2">
                        <i class="bi bi-arrow-clockwise me-1"></i>Повторить
                    </button>
                </div>
            `);
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
        $container.html(`
            <div class="text-center py-4">
                <i class="bi bi-cash-stack text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-2">У вас пока нет ставок</p>
                <a href="auctions.html" class="btn btn-primary btn-sm mt-2">
                    <i class="bi bi-cash-stack me-1"></i>Перейти к аукционам
                </a>
            </div>
        `);
        return;
    }
    let html = '';
    bids.forEach(bid => {
        const statusClass = bid.isWinning ? 'text-success' : 'text-secondary';
        const statusText = bid.isWinning ? 
            '<span class="badge bg-success"><i class="bi bi-trophy me-1"></i>Лидирует</span>' : 
            '<span class="badge bg-secondary"><i class="bi bi-clock-history me-1"></i>Перебита</span>';
        const date = new Date(bid.createdAt).toLocaleString('ru-RU');
        const auctionLink = `auction-detail.html?id=${bid.auctionId}`;
        html += `
            <div class="bid-item mb-3 pb-3 border-bottom">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">
                            <a href="${auctionLink}" class="text-decoration-none">
                                ${bid.auctionTitle || 'Аукцион #' + bid.auctionId}
                            </a>
                        </h6>
                        <div class="d-flex align-items-center gap-2">
                            ${statusText}
                            <small class="text-muted"><i class="bi bi-calendar me-1"></i>${date}</small>
                        </div>
                    </div>
                    <div class="text-end ms-3">
                        <strong class="d-block fs-5 text-primary">${formatPrice(bid.amount)} ₽</strong>
                        <a href="${auctionLink}" class="btn btn-sm btn-outline-primary mt-1">
                            <i class="bi bi-arrow-right me-1"></i>К аукциону
                        </a>
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
    console.log('Загрузка выигранных лотов для пользователя:', user.id);
    $.ajax({
        url: `/api/users/${user.id}/won-lots`,
        method: "GET",
        success: function(wonLots) {
            console.log('Выигранные лоты загружены:', wonLots);
            renderWonLots(wonLots);
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке выигранных лотов:', xhr.responseJSON);
            $('#won-lots').html(`
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Не удалось загрузить выигранные лоты
                    <button onclick="loadWonLots()" class="btn btn-sm btn-outline-secondary mt-2">
                        <i class="bi bi-arrow-clockwise me-1"></i>Повторить
                    </button>
                </div>
            `);
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
        $container.html(`
            <div class="text-center py-4">
                <i class="bi bi-trophy text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-2">У вас пока нет выигранных лотов</p>
                <a href="auctions.html" class="btn btn-primary btn-sm mt-2">
                    <i class="bi bi-cash-stack me-1"></i>Перейти к аукционам
                </a>
            </div>
        `);
        return;
    }
    let html = '';
    wonLots.forEach(lot => {
        const winDate = new Date(lot.winDate).toLocaleDateString('ru-RU');
        const imageUrl = lot.imageUrl || '/uploads/auctions/NOFOTO.jpg';
        html += `
            <div class="won-lot-item mb-3">
                <div class="card border-success">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-3">
                                <img src="${imageUrl}" 
                                     class="img-fluid rounded" 
                                     alt="${lot.title}"
                                     style="height: 80px; object-fit: cover;"
                                     onerror="this.onerror=null; this.src='/uploads/auctions/NOFOTO.jpg'">
                            </div>
                            <div class="col-9">
                                <h6 class="card-title text-success mb-1">
                                    <i class="bi bi-trophy me-2"></i>${lot.title}
                                </h6>
                                <div class="d-flex justify-content-between align-items-center mt-2">
                                    <div>
                                        <small class="text-muted">
                                            <i class="bi bi-calendar-check me-1"></i>Выиграна: ${winDate}
                                        </small>
                                    </div>
                                    <div>
                                        <strong class="text-success fs-5">${formatPrice(lot.finalPrice)} ₽</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    $container.html(html);
}

/**
 * 
 * @returns {undefined}
 */
function loadCompletedAuctions() {
    $.ajax({
        url: "/api/auctions/my/completed",
        method: "GET",
        success: function(auctions) {
            renderCompletedAuctions(auctions);
        },
        error: function(xhr) {
            console.error("Ошибка загрузки завершенных аукционов");
            $('#completed-auctions').html(`
                <div class="text-center py-4">
                    <p class="text-muted">Не удалось загрузить завершенные аукционы</p>
                </div>
            `);
        }
    });
}
/**
 * 
 * @param {type} auctions
 * @returns {undefined}
 */
function renderCompletedAuctions(auctions) {
    const $container = $('#completed-auctions');
    if (!auctions || auctions.length === 0) {
        $container.html(`
            <div class="text-center py-4">
                <p class="text-muted">Нет завершенных аукционов</p>
            </div>
        `);
        return;
    }
    let html = '';
    auctions.forEach(auction => {
        const endTime = new Date(auction.endTime);
        const statusClass = auction.status === 'FINISHED' ? 'badge bg-success' :
                           auction.status === 'EXPIRED' ? 'badge bg-warning' :
                           auction.status === 'CANCELLED' ? 'badge bg-danger' : 'badge bg-secondary';
        const statusText = auction.status === 'FINISHED' ? 'Завершен' :
                          auction.status === 'EXPIRED' ? 'Истек без ставок' :
                          auction.status === 'CANCELLED' ? 'Отменен' : 'Неизвестно';
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <img src="${auction.imageUrl || '/uploads/auctions/NOFOTO.jpg'}"
                         class="card-img-top" alt="${auction.title}"
                         style="height: 150px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title">${auction.title}</h6>
                        <div class="d-flex justify-content-between mb-2">
                            <span class="${statusClass}">${statusText}</span>
                            <small class="text-muted">${endTime.toLocaleDateString('ru-RU')}</small>
                        </div>
                        <p class="card-text small text-muted">
                            ${auction.description ? (auction.description.substring(0, 60) + '...') : 'Нет описания'}
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>${formatPrice(auction.currentPrice || auction.startPrice || 0)} ₽</strong>
                            <small class="text-muted">Ставок: ${auction.bidsCount || 0}</small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <a href="auction-detail.html?id=${auction.id}" class="btn btn-sm btn-outline-primary w-100">
                            Посмотреть детали
                        </a>
                    </div>
                </div>
            </div>
        `;
    });

    $container.html(html);
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