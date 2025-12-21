let allUsers = [];
let currentPage = 1;
const usersPerPage = 10;
$(document).ready(function() {
    console.log('admin-panel.js загружен');
    checkAdminAccess();
    setupEventHandlers();
});

/**
 * Проверяет доступ администратора
 */
function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        console.log('Пользователь является администратором');
        $('#admin-tab').show();
        $('#admin-tab').on('shown.bs.tab', function() {
            console.log('Активирована вкладка админ-панели');
            initAdminPanel();
        });
        if ($('#admin-tab').hasClass('active')) {
            console.log('Вкладка админ-панели уже активна, инициализируем');
            setTimeout(initAdminPanel, 100);
        }
    } else {
        console.log('Пользователь не администратор');
        $('#admin-tab').hide();
    }
}

/**
 * Настраивает обработчики событий
 */
function setupEventHandlers() {
    $(document).on('click', '#create-user-btn', function(e) {
        e.preventDefault();
        console.log('Кнопка "Создать пользователя" нажата');
        showCreateUserModal();
    });
    $(document).on('click', '#save-new-user-btn', function(e) {
        e.preventDefault();
        createNewUser();
    });
    $(document).on('click', '#save-user-btn', function(e) {
        e.preventDefault();
        saveUserChanges();
    });
    $(document).on('click', '#delete-user-btn', function(e) {
        e.preventDefault();
        showConfirmDialog(
            'Удаление пользователя',
            'Вы уверены, что хотите удалить этого пользователя?',
            function() {
                deleteUser();
            }
        );
    });
    $(document).on('change', '#new-user-avatar', function(e) {
        if (e.target.files && e.target.files[0]) {
            previewNewUserAvatar(e.target.files[0]);
        }
    });
    $(document).on('click', '.user-row', function(e) {
        if ($(e.target).closest('.toggle-password-btn, .toggle-ban-btn').length > 0) {
            return;
        }
        const userId = $(this).data('user-id');
        openEditModal(userId);
    });
    $(document).on('click', '.toggle-password-btn', function(e) {
        e.stopPropagation();
        const $button = $(this);
        const $span = $button.siblings('.password-field');
        const password = $button.data('password') || '';
        if ($span.text().includes('*')) {
            $span.text(password);
            $button.html('🙈');
        } else {
            $span.text('*'.repeat(password.length || 6));
            $button.html('👁️');
        }
    });
}

/**
 * Инициализирует админ-панель
 */
function initAdminPanel() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin'){
        console.log('Инициализация админ-панели');
        loadAllUsers();
        updateAdminPanelHeader();
    }
}

/**
 * Обновляет заголовок админ-панели
 */
function updateAdminPanelHeader() {
    const headerHtml = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h5 class="mb-0">Управление пользователями</h5>
                <p class="text-muted small mb-0">Всего пользователей: <span id="total-users-count">${allUsers.length}</span></p>
            </div>
            <div class="d-flex gap-2">
                <a href="create-auction.html" class="btn btn-primary btn-sm">
                    <i class="bi bi-plus-circle me-1"></i> Создать аукцион
                </a>
                <button id="create-user-btn" class="btn btn-success btn-sm">
                    <i class="bi bi-person-plus me-1"></i> Создать пользователя
                </button>
            </div>
        </div>
    `;
    $('.card-header:has(h5:contains("Управление пользователями"))').html(headerHtml);
}

/**
 * Загружает всех пользователей с сервера
 */
function loadAllUsers() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin'){
        $('#users-table-body').html(`
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                    Загрузка пользователей...
                </td>
            </tr>
        `);
        $.ajax({
            url: "/api/users/all",
            method: "GET",
            success: function(users) {
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                allUsers = users.filter(user => user.id !== currentUser.id);
                renderUsersTable();
                setupPagination();
                updateAdminPanelHeader();
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON?.error || 'Не удалось загрузить пользователей';

                $('#users-table-body').html(`
                    <tr>
                        <td colspan="8" class="text-center text-danger py-4">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            ${errorMsg}
                            <br>
                            <button class="btn btn-sm btn-outline-secondary mt-2" onclick="location.reload()">
                                <i class="bi bi-arrow-clockwise me-1"></i>Перезагрузить страницу
                            </button>
                        </td>
                    </tr>
                `);
            }
        });
    }
}

/**
 * Рендерит таблицу пользователей
 */
function renderUsersTable() {
    const $tbody = $('#users-table-body');
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = allUsers.slice(startIndex, endIndex);
    if (pageUsers.length === 0) {
        $tbody.html(`
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-people me-2"></i>
                    Нет пользователей
                </td>
            </tr>
        `);
        return;
    }
    let html = '';
    pageUsers.forEach(user => {
        const statusClass = user.bannedStatus ? 'text-danger' : 'text-success';
        const statusIcon = user.bannedStatus ? 'bi-person-x' : 'bi-person-check';
        const statusText = user.bannedStatus ? 'Заблокирован' : 'Активен';
        const roleText = getRoleDisplayName(user.role);
        const password = user.password || '';
        const avatar = user.avatarPath || user.avatarUrl || '/uploads/avatars/img.png';
        const visits = user.visits || 0;
        const email = user.email || 'Не указан';
        html += `
            <tr class="user-row" data-user-id="${user.id}" style="cursor: pointer;">
                <td class="user-id-cell">
                    <span class="badge bg-secondary">#${user.id}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${avatar}" class="rounded-circle me-2" width="36" height="36" alt="Аватар" 
                             onerror="this.src='/uploads/avatars/img.png'">
                        <div>
                            <div class="fw-medium">${user.fullName || 'Не указано'}</div>
                            <small class="text-muted">ID: ${user.id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <code class="user-email">${email}</code>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <span class="password-field" data-password="${password}">${'*'.repeat(password.length || 6)}</span>
                        <button class="btn btn-sm btn-outline-secondary toggle-password-btn ms-1" 
                                data-password="${password}" title="Показать/скрыть пароль">
                            👁️
                        </button>
                    </div>
                </td>
                <td>${user.birthDate || '<span class="text-muted">Не указана</span>'}</td>
                <td>
                    <span class="badge ${visits > 0 ? 'bg-info' : 'bg-secondary'}">
                        <i class="bi bi-door-open me-1"></i>${visits}
                    </span>
                </td>
                <td>
                    <span class="badge ${getRoleBadgeColor(user.role)}">
                        <i class="bi ${getRoleIcon(user.role)} me-1"></i>${roleText}
                    </span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi ${statusIcon} me-1 ${statusClass}"></i>
                        <span class="${statusClass} fw-medium">
                            ${statusText}
                        </span>
                    </div>
                </td>
            </tr>
        `;
    });
    $tbody.html(html);
}

/**
 * Настраивает пагинацию
 */
function setupPagination() {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    const $pagination = $('#pagination');
    if (totalPages <= 1) {
        $pagination.html('');
        return;
    }
    let html = '';
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    $pagination.html(html);
    $pagination.find('.page-link').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const page = $(this).data('page');
        if (page && page >= 1 && page <= totalPages) {
            currentPage = page;
            renderUsersTable();
            setupPagination();
        }
    });
}

/**
 * Возвращает цвет бейджа в зависимости от роли
 */
function getRoleBadgeColor(role) {
    switch(role) {
        case 'admin': return 'bg-danger';
        case 'moder': return 'bg-warning text-dark';
        case 'user': return 'bg-primary';
        default: return 'bg-secondary';
    }
}

/**
 * Возвращает иконку в зависимости от роли
 */
function getRoleIcon(role) {
    switch(role) {
        case 'admin': return 'bi-shield-check';
        case 'moder': return 'bi-shield-exclamation';
        case 'user': return 'bi-person';
        default: return 'bi-person';
    }
}

/**
 * Блокирует или разблокирует пользователя
 */
function toggleUserBan(userId, banned, $row) {
    showConfirmDialog(
        banned ? 'Блокировка пользователя' : 'Разблокировка пользователя',
        banned ? 'Заблокировать пользователя?' : 'Разблокировать пользователя?',
        function() {
            performBanUser(userId, banned);
        }
    );
}

/**
 * Выполняет блокировку/разблокировку пользователя
 */
function performBanUser(userId, banned) {
    $.ajax({
        url: `/api/users/${userId}/ban`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ banned: banned }),
        success: function(response) {
            const index = allUsers.findIndex(u => u.id == userId);
            if (index !== -1) {
                allUsers[index].bannedStatus = banned;
            }
            renderUsersTable();
            showUserNotification(
                banned ? '✅ Пользователь заблокирован' : '✅ Пользователь разблокирован',
                'success'
            );
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            showUserNotification('❌ Ошибка: ' + (response?.error || 'Не удалось изменить статус'), 'danger');
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
        $notification.fadeOut(300, function () {
            $(this).remove();
        });
    }, 3000);
}

/**
 * Показывает диалог подтверждения
 * @param {string} title - Заголовок диалога
 * @param {string} message - Сообщение
 * @param {function} onConfirm - Функция при подтверждении
 */
function showConfirmDialog(title, message, onConfirm) {
    const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
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
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
    $('#confirmOkBtn').on('click', function() {
        modal.hide();
        $('.modal-backdrop').remove();
        $('#confirmModal').remove();
        onConfirm();
    });
    $('#confirmModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}

/**
 * Открывает модальное окно для редактирования пользователя
 */
function openEditModal(userId) {
    const user = allUsers.find(u => u.id == userId);
    if (!user) {
        showUserNotification('Ошибка: Пользователь не найден', 'danger');
        return;
    }
    $('#edit-user-id').val(user.id);
    $('#edit-fullname').val(user.fullName || '');
    $('#edit-email').val(user.email || '');
    $('#edit-password').val('');
    $('#edit-birthdate').val(user.birthDate || '');
    $('#edit-role').val(user.role || 'user');
    $('#edit-banned').prop('checked', user.bannedStatus || false);
    $('#editUserModal .modal-title').html(`
        <div class="d-flex align-items-center">
            <i class="bi bi-person-gear me-2"></i>
            <div>
                <div>Редактирование пользователя</div>
                <small class="text-muted">ID: ${user.id}, Email: ${user.email}</small>
            </div>
        </div>
    `);
    const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    editModal.show();
}

/**
 * Показывает модальное окно для создания нового пользователя
 */
function showCreateUserModal() {
    console.log('Открытие модального окна создания пользователя');
    $('#new-user-form')[0].reset();
    $('#new-user-avatar-preview').html(`
        <div class="text-center">
            <img src="/uploads/avatars/img.png" 
                 class="rounded-circle mb-2" width="150" height="150" alt="Предпросмотр аватара" 
                 id="new-user-avatar-img">
            <div class="text-muted small">Аватар пользователя</div>
        </div>
    `);
    $('#new-user-avatar-file-info').hide();
    $('#new-user-avatar').val('');
    const createModal = new bootstrap.Modal(document.getElementById('createUserModal'));
    createModal.show();
}

/**
 * Предпросмотр аватара
 */
function previewNewUserAvatar(file) {
    if (!file || !file.type.startsWith('image/')) {
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        $('#new-user-avatar-img').attr('src', e.target.result);
        $('#new-user-avatar-file-info').show().text(`Файл: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsDataURL(file);
}

/**
 * Создает нового пользователя
 */
function createNewUser() {
    const formData = new FormData();
    const fullName = $('#new-user-fullname').val().trim();
    const email = $('#new-user-email').val().trim();
    const password = $('#new-user-password').val().trim();
    const birthDate = $('#new-user-birthdate').val();
    const role = $('#new-user-role').val();
    const bannedStatus = $('#new-user-banned').prop('checked');
    if (!fullName) {
        showUserNotification('Пожалуйста, введите имя пользователя', 'warning');
        $('#new-user-fullname').focus();
        return;
    }
    if (!email) {
        showUserNotification('Пожалуйста, введите email', 'warning');
        $('#new-user-email').focus();
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showUserNotification('Пожалуйста, введите корректный email адрес', 'warning');
        $('#new-user-email').focus();
        return;
    }
    if (!password) {
        showUserNotification('Пожалуйста, введите пароль', 'warning');
        $('#new-user-password').focus();
        return;
    }
    if (password.length < 6) {
        showUserNotification('Пароль должен содержать минимум 6 символов', 'warning');
        $('#new-user-password').focus();
        return;
    }
    formData.append('email', email);
    formData.append('fullName', fullName);
    formData.append('birthDate', birthDate || '');
    formData.append('password', password);
    formData.append('role', role || 'user');
    formData.append('bannedStatus', bannedStatus);
    const avatarInput = document.getElementById('new-user-avatar');
    if (avatarInput && avatarInput.files.length > 0) {
        const avatarFile = avatarInput.files[0];
        formData.append('avatar', avatarFile);
    }
    const $saveBtn = $('#save-new-user-btn');
    const originalText = $saveBtn.text();
    $saveBtn.prop('disabled', true).text('Создание...');
    console.log('Отправка запроса на создание пользователя с аватаркой');
    console.log('Данные:', {
        email: email,
        fullName: fullName,
        role: role,
        bannedStatus: bannedStatus,
        hasAvatar: avatarInput && avatarInput.files.length > 0
    });
    $.ajax({
        url: "/api/users/create-with-avatar",
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function(newUser) {
            console.log('Пользователь успешно создан:', newUser);
            allUsers.unshift(newUser);
            currentPage = 1;
            renderUsersTable();
            setupPagination();
            updateAdminPanelHeader();
            const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
            if (modal) {
                modal.hide();
            }
            showUserNotification('✅ Пользователь успешно создан!', 'success');
        },
        error: function(xhr) {
            console.error('Ошибка при создании пользователя:', xhr);
            let errorMsg = 'Неизвестная ошибка';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg = xhr.responseJSON.error;
            } else if (xhr.status === 400) {
                errorMsg = 'Некорректные данные';
            } else if (xhr.status === 401) {
                errorMsg = 'Требуется авторизация';
            } else if (xhr.status === 403) {
                errorMsg = 'Доступ запрещен';
            } else if (xhr.status === 409) {
                errorMsg = 'Пользователь с таким email уже существует';
            } else if (xhr.status === 415) {
                errorMsg = 'Неподдерживаемый тип данных. Попробуйте выбрать другое изображение';
            } else if (xhr.status === 500) {
                errorMsg = 'Внутренняя ошибка сервера';
            }
            showUserNotification('❌ Ошибка: ' + errorMsg, 'danger');
        },
        complete: function() {
            $saveBtn.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Сохраняет изменения пользователя
 */
function saveUserChanges() {
    const userId = $('#edit-user-id').val();
    if (!userId) {
        showUserNotification('Ошибка: ID пользователя не указан', 'danger');
        return;
    }
    const userData = {
        fullName: $('#edit-fullname').val().trim(),
        email: $('#edit-email').val().trim(),
        birthDate: $('#edit-birthdate').val(),
        role: $('#edit-role').val(),
        bannedStatus: $('#edit-banned').prop('checked')
    };
    if (!userData.fullName) {
        showUserNotification('Пожалуйста, введите имя пользователя', 'warning');
        $('#edit-fullname').focus();
        return;
    }
    if (!userData.email) {
        showUserNotification('Пожалуйста, введите email', 'warning');
        $('#edit-email').focus();
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        showUserNotification('Пожалуйста, введите корректный email адрес', 'warning');
        $('#edit-email').focus();
        return;
    }
    const password = $('#edit-password').val();
    if (password && password.trim() !== '') {
        if (password.trim().length < 6) {
            showUserNotification('Пароль должен содержать минимум 6 символов', 'warning');
            $('#edit-password').focus();
            return;
        }
        userData.password = password.trim();
    }
    sendUpdateRequest(userId, userData);
}

/**
 * Отправляет запрос на обновление данных
 */
function sendUpdateRequest(userId, userData) {
    const $saveBtn = $('#save-user-btn');
    const originalText = $saveBtn.text();
    $saveBtn.prop('disabled', true).text('Сохранение...');
    $.ajax({
        url: `/api/users/${userId}/admin-update`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify(userData),
        success: function(updatedUser) {
            const index = allUsers.findIndex(u => u.id == userId);
            if (index !== -1) {
                allUsers[index] = updatedUser;
            }
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            if (modal) {
                modal.hide();
            }
            renderUsersTable();
            showUserNotification('✅ Пользователь успешно обновлен!', 'success');
        },
        error: function(xhr) {
            let errorMsg = 'Неизвестная ошибка';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg = xhr.responseJSON.error;
            }
            
            showUserNotification('❌ Ошибка: ' + errorMsg, 'danger');
        },
        complete: function() {
            $saveBtn.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Удаляет пользователя
 */
function deleteUser() {
    const userId = $('#edit-user-id').val();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id == userId) {
        showUserNotification('Ошибка: Нельзя удалить самого себя', 'danger');
        return;
    }
    $.ajax({
        url: `/api/users/${userId}`,
        method: "DELETE",
        success: function(response) {
            allUsers = allUsers.filter(u => u.id != userId);
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            if (modal) {
                modal.hide();
            }
            renderUsersTable();
            setupPagination();
            updateAdminPanelHeader();
            showUserNotification('✅ Пользователь успешно удален!', 'success');
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            const errorMsg = response?.error || 'Ошибка при удалении пользователя';
            showUserNotification('❌ Ошибка: ' + errorMsg, 'danger');
        }
    });
}

/**
 * Возвращает читаемое название роли
 */
function getRoleDisplayName(role) {
    switch(role) {
        case 'admin': return 'Администратор';
        case 'moder': return 'Модератор';
        case 'user': return 'Пользователь';
        default: return 'Гость';
    }
}