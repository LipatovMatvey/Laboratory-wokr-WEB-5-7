
let allUsers = [];
let currentPage = 1;
const usersPerPage = 10;
let isInitialized = false;

/**
 * Инициализирует админ-панель: проверяет права администратора,
 * загружает пользователей и настраивает обработчики событий.
 */
function initAdminPanel() {
    if (isInitialized) return;
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
        $('#admin-tab').hide();
        $('#admin-panel').hide();
        return;
    }
    
    loadAllUsers();
    
    $('#save-user-btn').off('click').on('click', saveUserChanges);
    $('#delete-user-btn').off('click').on('click', deleteUser);
    $('#create-user-btn').off('click').on('click', showCreateUserModal);
    $('#save-new-user-btn').off('click').on('click', createNewUser);
    
    $('#new-user-avatar').off('change').on('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            previewNewUserAvatar(e.target.files[0]);
        }
    });
    
    isInitialized = true;
}

/**
 * Загружает всех пользователей с сервера, исключая текущего администратора.
 * Отображает индикатор загрузки и обрабатывает возможные ошибки.
 */
function loadAllUsers() {
    $('#users-table-body').html(`
        <tr>
            <td colspan="8" class="text-center text-muted">
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
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON?.error || 'Не удалось загрузить пользователей';
            
            $('#users-table-body').html(`
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        ${errorMsg}
                        <br>
                        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="location.reload()">
                            Перезагрузить страницу
                        </button>
                    </td>
                </tr>
            `);
        }
    });
}

/**
 * Рендерит таблицу пользователей для текущей страницы.
 * Отображает аватары, пароли (скрытые), роли и статусы пользователей.
 * Настраивает обработчики кликов для просмотра пароля и редактирования.
 */
function renderUsersTable() {
    const $tbody = $('#users-table-body');
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = allUsers.slice(startIndex, endIndex);
    
    if (pageUsers.length === 0) {
        $tbody.html(`
            <tr>
                <td colspan="8" class="text-center text-muted">
                    Нет пользователей
                </td>
            </tr>
        `);
        return;
    }
    
    let html = '';
    pageUsers.forEach(user => {
        const statusClass = user.bannedStatus ? 'text-danger' : 'text-success';
        const statusText = user.bannedStatus ? 'Заблокирован' : 'Активен';
        const roleText = getRoleDisplayName(user.role);
        const password = user.password || '';
        const avatar = user.avatarPath || user.avatarUrl || '../img/user-default.jpg';
        
        html += `
            <tr class="user-row" data-user-id="${user.id}" style="cursor: pointer;">
                <td><strong>${user.id}</strong></td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${avatar}" class="rounded-circle me-2" width="36" height="36" alt="Аватар" 
                             onerror="this.src='../img/default-avatar.png'">
                        <span>${user.fullName || 'Не указано'}</span>
                    </div>
                </td>
                <td><code>${user.email}</code></td>
                <td>
                    <span class="password-field" data-password="${password}">${'*'.repeat(password.length || 6)}</span>
                    <button class="btn btn-sm btn-outline-secondary toggle-password-btn ms-1" 
                            data-password="${password}">
                        👁
                    </button>
                </td>
                <td>${user.birthDate || '<span class="text-muted">Не указана</span>'}</td>
                <td><strong>${user.visits || 0}</strong></td>
                <td>
                    <span class="badge bg-${getRoleBadgeColor(user.role)}">
                        ${roleText}
                    </span>
                </td>
                <td>
                    <span class="${statusClass} fw-bold">
                        ${statusText}
                    </span>
                </td>
            </tr>
        `;
    });
    
    $tbody.html(html);
    
    $('.toggle-password-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        const $button = $(this);
        const $span = $button.siblings('.password-field');
        const password = $button.data('password') || '';
        
        if ($span.text().includes('*')) {
            $span.text(password);
            $button.text('🙈');
        } else {
            $span.text('*'.repeat(password.length || 6));
            $button.text('👁');
        }
    });
    
    $('.user-row').off('click').on('click', function(e) {
        if ($(e.target).closest('.toggle-password-btn').length > 0) {
            return;
        }
        
        const userId = $(this).data('user-id');
        openEditModal(userId);
    });
}

/**
 * Возвращает цвет бейджа в зависимости от роли пользователя.
 * @param {string} role - Роль пользователя (admin, moder, user)
 * @returns {string} CSS класс цвета для бейджа
 */
function getRoleBadgeColor(role) {
    switch(role) {
        case 'admin': return 'danger';
        case 'moder': return 'warning';
        case 'user': return 'primary';
        default: return 'secondary';
    }
}

/**
 * Настраивает пагинацию для таблицы пользователей.
 * Создает кнопки навигации и обрабатывает переходы между страницами.
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
            <a class="page-link" href="#" data-page="${currentPage - 1}">←</a>
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
            <a class="page-link" href="#" data-page="${currentPage + 1}">→</a>
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
        }
    });
}

/**
 * Отправляет запрос на обновление данных пользователя на сервере.
 * @param {number} userId - ID пользователя
 * @param {object} userData - Обновленные данные пользователя
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
            showNotification('✅ Пользователь успешно обновлен!', 'success');
        },
        error: function(xhr) {
            let errorMsg = 'Неизвестная ошибка';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg = xhr.responseJSON.error;
            } else if (xhr.status === 401) {
                errorMsg = 'Ошибка авторизации';
            } else if (xhr.status === 403) {
                errorMsg = 'Доступ запрещен';
            } else if (xhr.status === 404) {
                errorMsg = 'Пользователь не найден';
            } else if (xhr.status === 400) {
                errorMsg = 'Некорректные данные';
            }
            
            showNotification('❌ Ошибка: ' + errorMsg, 'danger');
        },
        complete: function() {
            $saveBtn.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Показывает уведомление пользователю.
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления (success, danger, warning, info)
 */
function showNotification(message, type = 'info') {
    $('.notification-toast').remove();
    
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'danger' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const $toast = $(`
        <div class="notification-toast position-fixed top-0 end-0 m-3" style="z-index: 9999;">
            <div class="toast show" role="alert">
                <div class="toast-header">
                    <strong class="me-auto">Уведомление</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body ${alertClass}">
                    ${message}
                </div>
            </div>
        </div>
    `);
    
    $('body').append($toast);
    
    setTimeout(() => {
        $toast.remove();
    }, 4000);
}

/**
 * Открывает модальное окно для редактирования пользователя.
 * @param {number} userId - ID пользователя для редактирования
 */
function openEditModal(userId) {
    const user = allUsers.find(u => u.id == userId);
    if (!user) {
        showNotification('Ошибка: Пользователь не найден', 'danger');
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
        Редактирование пользователя
        <small class="text-muted d-block">ID: ${user.id}, Email: ${user.email}</small>
    `);
    
    const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    editModal.show();
}

/**
 * Показывает модальное окно для создания нового пользователя
 */
function showCreateUserModal() {
    $('#new-user-form')[0].reset();
    $('#new-user-avatar-preview').html(`
        <div class="text-center">
            <img src="../img/user-default.jpg"
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
 * Предпросмотр аватара для нового пользователя
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
    const userData = {
        fullName: $('#new-user-fullname').val().trim(),
        email: $('#new-user-email').val().trim(),
        password: $('#new-user-password').val().trim(),
        birthDate: $('#new-user-birthdate').val(),
        role: $('#new-user-role').val(),
        bannedStatus: $('#new-user-banned').prop('checked')
    };
    
    if (!userData.fullName) {
        showNotification('Пожалуйста, введите имя пользователя', 'warning');
        $('#new-user-fullname').focus();
        return;
    }
    
    if (!userData.email) {
        showNotification('Пожалуйста, введите email', 'warning');
        $('#new-user-email').focus();
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        showNotification('Пожалуйста, введите корректный email адрес', 'warning');
        $('#new-user-email').focus();
        return;
    }
    
    if (!userData.password) {
        showNotification('Пожалуйста, введите пароль', 'warning');
        $('#new-user-password').focus();
        return;
    }
    
    if (userData.password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'warning');
        $('#new-user-password').focus();
        return;
    }
    
    const $saveBtn = $('#save-new-user-btn');
    const originalText = $saveBtn.text();
    $saveBtn.prop('disabled', true).text('Создание...');
    
    console.log('Отправка запроса на создание пользователя:', userData);
    
    $.ajax({
        url: "/api/users/create",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(userData),
        success: function(newUser) {
            console.log('Пользователь успешно создан:', newUser);
            
            allUsers.unshift(newUser);
            
            currentPage = 1;
            
            renderUsersTable();
            setupPagination();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
            if (modal) {
                modal.hide();
            }
            
            showNotification('✅ Пользователь успешно создан!', 'success');
        },
        error: function(xhr, status, error) {
            console.error('Ошибка при создании пользователя:', {
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                error: error
            });
            
            let errorMsg = 'Неизвестная ошибка';
            
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg = xhr.responseJSON.error;
            } else if (xhr.status === 400) {
                errorMsg = 'Некорректные данные';
            } else if (xhr.status === 401) {
                errorMsg = 'Требуется авторизация';
            } else if (xhr.status === 403) {
                errorMsg = 'Доступ запрещен';
            } else if (xhr.status === 404) {
                errorMsg = 'Эндпоинт не найден';
            } else if (xhr.status === 405) {
                errorMsg = 'Метод не разрешен';
            } else if (xhr.status === 409) {
                errorMsg = 'Пользователь с таким email уже существует';
            } else if (xhr.responseText) {
                // Попробуем получить текст ошибки
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.error || errorMsg;
                } catch (e) {
                    errorMsg = xhr.responseText || errorMsg;
                }
            }
            
            showNotification('❌ Ошибка: ' + errorMsg, 'danger');
        },
        complete: function() {
            $saveBtn.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Обрабатывает сохранение изменений пользователя.
 * Собирает данные из формы, валидирует их и отправляет на сервер.
 */
function saveUserChanges() {
    const userId = $('#edit-user-id').val();
    if (!userId) {
        showNotification('Ошибка: ID пользователя не указан', 'danger');
        return;
    }
    
    const userData = {
        fullName: $('#edit-fullname').val().trim(),
        email: $('#edit-email').val().trim(),
        birthDate: $('#edit-birthdate').val(),
        role: $('#edit-role').val(),
        bannedStatus: $('#edit-banned').prop('checked'),
        preserveVisits: true
    };
    
    if (!userData.fullName) {
        showNotification('Пожалуйста, введите имя пользователя', 'warning');
        $('#edit-fullname').focus();
        return;
    }
    
    if (!userData.email) {
        showNotification('Пожалуйста, введите email', 'warning');
        $('#edit-email').focus();
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        showNotification('Пожалуйста, введите корректный email адрес', 'warning');
        $('#edit-email').focus();
        return;
    }
    
    const password = $('#edit-password').val();
    if (password && password.trim() !== '') {
        if (password.trim().length < 6) {
            showNotification('Пароль должен содержать минимум 6 символов', 'warning');
            $('#edit-password').focus();
            return;
        }
        userData.password = password.trim();
    }
    
    sendUpdateRequest(userId, userData);
}

/**
 * Удаляет пользователя после подтверждения.
 * Отправляет запрос на удаление и обновляет таблицу.
 */
function deleteUser() {
    const userId = $('#edit-user-id').val();
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id == userId) {
        showNotification('Ошибка: Нельзя удалить самого себя', 'danger');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) {
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
            showNotification('✅ Пользователь успешно удален!', 'success');
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            const errorMsg = response?.error || 'Ошибка при удалении пользователя';
            showNotification('❌ Ошибка: ' + errorMsg, 'danger');
        }
    });
}

/**
 * Возвращает читаемое название роли пользователя.
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
 * Инициализация админ-панели при загрузке страницы.
 * Проверяет авторизацию и настраивает обработчики вкладок.
 */
$(document).ready(function() {
    if ($('#admin-panel').length > 0) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') {
            $('#admin-tab').on('shown.bs.tab', function(e) {
                initAdminPanel();
            });
            
            if ($('#admin-tab').hasClass('active')) {
                setTimeout(function() {
                    initAdminPanel();
                }, 100);
            }
        } else {
            $('#admin-tab').hide();
        }
    }
});
