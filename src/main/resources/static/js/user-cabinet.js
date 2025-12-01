$(document).ready(function() {
    // Проверка авторизации
    checkAuth();
    
    // Обработчик выхода
    $('#logout-btn').on('click', function() {
        logout();
    });
    
    // Загрузка данных пользователя
    loadUserData();
    
    // Обработчики форм
    $('#user-data-form').on('submit', function(e) {
        e.preventDefault();
        updateUserData();
    });
    
    $('#avatar-upload').on('change', function(e) {
        uploadAvatar(e.target.files[0]);
    });
    
    // Загрузка ставок и выигранных лотов
    loadUserBids();
    loadWonLots();
});

function checkAuth() {
    console.log('Проверка авторизации...');
    $.ajax({
        url: "/auth/whoAmI",
        method: "GET",
        success: function(response) {
            console.log('Ответ от сервера:', response);
            updateNavigation(response);
        },
        error: function(xhr, status, error) {
            console.error('Ошибка проверки авторизации:', error);
            window.location.href = 'auth.html';
        }
    });
}

function updateNavigation(response) {
    console.log('Обновление навигации с данными:', response);
    
    if (response.authenticated) {
        console.log('Пользователь авторизован, имя:', response.fullName, 'роль:', response.role);
        $('#user-info').text(response.fullName || 'Пользователь');
        $('#user-role').text(getRoleDisplayName(response.role));
        $('#login-item').addClass('hidden');
        $('#logout-item').removeClass('hidden');
        $('#user-cabinet-item').removeClass('hidden');
        localStorage.setItem('user', JSON.stringify(response));
    } else {
        console.log('Пользователь не авторизован, перенаправление на auth.html');
        window.location.href = 'auth.html';
    }
}

function getRoleDisplayName(role) {
    switch(role) {
        case 'admin': return 'Администратор';
        case 'moder': return 'Модератор';
        case 'user': return 'Пользователь';
        default: return 'Гость';
    }
}


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

function loadUserData() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (user.authenticated) {
        $('#user-name').val(user.fullName || '');
        $('#user-email').val(user.email || '');
        
        if (user.avatarUrl) {
            $('#user-avatar').attr('src', user.avatarUrl);
        }
        
        // Загружаем актуальные данные с сервера
        $.ajax({
            url: `/api/users/${user.id}`,
            method: "GET",
            success: function(userData) {
                $('#user-name').val(userData.fullName);
                $('#user-email').val(userData.email);
                if (userData.avatarUrl) {
                    $('#user-avatar').attr('src', userData.avatarUrl);
                }
            }
        });
    }
}

function updateUserData() {
    const userData = {
        fullName: $('#user-name').val(),
        email: $('#user-email').val()
    };
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    $.ajax({
        url: `/api/users/${user.id}`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify(userData),
        success: function(updatedUser) {
            alert('Данные успешно обновлены!');
            // Обновляем данные в localStorage
            const currentUser = JSON.parse(localStorage.getItem('user'));
            currentUser.fullName = updatedUser.fullName;
            currentUser.email = updatedUser.email;
            localStorage.setItem('user', JSON.stringify(currentUser));
            $('#user-info').text(updatedUser.fullName);
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            alert(response?.error || 'Ошибка при обновлении данных');
        }
    });
}

function uploadAvatar(file) {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
        alert('Размер файла не должен превышать 5MB');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    $.ajax({
        url: `/api/users/${user.id}/avatar`,
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            $('#user-avatar').attr('src', response.avatarUrl);
            // Обновляем аватар в localStorage
            const currentUser = JSON.parse(localStorage.getItem('user'));
            currentUser.avatarUrl = response.avatarUrl;
            localStorage.setItem('user', JSON.stringify(currentUser));
            alert('Аватар успешно обновлен!');
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            alert(response?.error || 'Ошибка при загрузке аватара');
        }
    });
}

function loadUserBids() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    $.ajax({
        url: `/api/users/${user.id}/bids`,
        method: "GET",
        success: function(bids) {
            renderUserBids(bids);
        },
        error: function(xhr) {
            console.error('Ошибка загрузки ставок:', xhr.responseText);
            $('#user-bids').html('<p class="text-danger">Ошибка загрузки ставок</p>');
        }
    });
}

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

function loadWonLots() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    $.ajax({
        url: `/api/users/${user.id}/won-lots`,
        method: "GET",
        success: function(wonLots) {
            renderWonLots(wonLots);
        },
        error: function(xhr) {
            console.error('Ошибка загрузки выигранных лотов:', xhr.responseText);
            $('#won-lots').html('<p class="text-danger">Ошибка загрузки выигранных лотов</p>');
        }
    });
}

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