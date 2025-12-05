/**
 * Основная функция инициализации личного кабинета.
 * Настраивает обработчики событий и загружает данные пользователя.
 */
$(document).ready(function() {
    checkAuth();
    
    $('#logout-btn').on('click', function() {
        logout();
    });
    
    loadUserData();
    
    $('#user-data-form').on('submit', function(e) {
        e.preventDefault();
        updateUserData();
    });
    
    $('#avatar-upload').on('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            uploadAvatar(e.target.files[0]);
        }
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
            $("#server-time").text("Точное московское время: "+data.time);
        }
    });
}

setInterval(updateServerTime, 1000);
updateServerTime();

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
    
    if (user.avatarUrl) {
        $('#user-avatar').attr('src', user.avatarUrl);
    } else {
        $('#user-avatar').attr('src', '../img/user-default.jpg');
    }
    
    $.ajax({
        url: `/api/users/${user.id}`,
        method: "GET",
        success: function(userData) {
            $('#user-name').val(userData.fullName || '');
            $('#user-email').val(userData.email || '');
            $('#user-birthdate').val(userData.birthDate || '');
            
            if (userData.avatarPath) {
                $('#user-avatar').attr('src', userData.avatarPath);
                user.avatarUrl = userData.avatarPath;
                localStorage.setItem('user', JSON.stringify(user));
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
    
    $.ajax({
        url: `/api/users/${user.id}`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify(userData),
        success: function(updatedUser) {
            user.fullName = updatedUser.fullName;
            user.email = updatedUser.email;
            user.birthdate = updatedUser.birthDate;
            localStorage.setItem('user', JSON.stringify(user));
            
            $('#user-info').text(updatedUser.fullName);
            
            showUserNotification('✅ Данные успешно обновлены!', 'success');
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
 * Загружает и обновляет аватар пользователя.
 * @param {File} file - Файл изображения для загрузки
 */
function uploadAvatar(file) {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showUserNotification('Пожалуйста, выберите файл изображения (JPG, PNG, GIF)', 'warning');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showUserNotification('Размер файла не должен превышать 5MB', 'warning');
        return;
    }
    
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        showUserNotification('Ошибка: пользователь не авторизован', 'danger');
        return;
    }
    
    const user = JSON.parse(userStr);
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    const $avatar = $('#user-avatar');
    const originalSrc = $avatar.attr('src');
    $avatar.css('opacity', '0.5');
    
    $.ajax({
        url: `/api/users/${user.id}/avatar`,
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            $avatar.attr('src', response.avatarUrl).css('opacity', '1');
            
            user.avatarUrl = response.avatarUrl;
            localStorage.setItem('user', JSON.stringify(user));
            
            showUserNotification('✅ Аватар успешно обновлен!', 'success');
        },
        error: function(xhr) {
            $avatar.attr('src', originalSrc).css('opacity', '1');
            
            const response = xhr.responseJSON;
            showUserNotification('❌ Ошибка: ' + (response?.error || 'Не удалось загрузить аватар'), 'danger');
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