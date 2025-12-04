$(document).ready(function() {
    $('.auth-tab').on('click', function() {
        const tab = $(this).data('tab');
        $('.auth-tab').removeClass('active');
        $(this).addClass('active');
        $('.auth-form').removeClass('active');
        $(`#${tab}-form`).addClass('active');
    });

    $('.toggle-password').on('click', function() {
        const target = $(this).data('target');
        const input = $(`#${target}`);
        const type = input.attr('type') === 'password' ? 'text' : 'password';
        input.attr('type', type);
        $(this).text(type === 'password' ? '👁️' : '🔒');
    });

    $('#login-form').on('submit', function(e) {
        e.preventDefault();
        const email = $('#login-email').val();
        const password = $('#login-password').val();

        $.ajax({
            url: "/auth/login",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                email: email,
                password: password
            }),
            success: function(response) {
                localStorage.setItem('user', JSON.stringify(response));
                window.location.href = "main.html";
            },
            error: function(xhr) {
                const response = xhr.responseJSON;
                alert(response?.error || "Ошибка авторизации");
            }
        });
    });

    // В функции submit регистрационной формы добавьте обработку аватарки
    $('#register-form').on('submit', function(e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('email', $('#register-email').val());
        formData.append('fullName', $('#register-name').val());
        formData.append('password', $('#register-password').val());
        formData.append('birthDate', $('#birth-date').val());

        const password = $('#register-password').val();
        const confirmPassword = $('#register-confirm-password').val();

        if (password !== confirmPassword) {
            alert("Пароли не совпадают");
            return;
        }

        // Добавляем аватарку, если она была выбрана
        const avatarInput = document.getElementById('register-avatar');
        if (avatarInput && avatarInput.files.length > 0) {
            formData.append('avatar', avatarInput.files[0]);
        }

        $.ajax({
            url: "/auth/register",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                localStorage.setItem('user', JSON.stringify(response));
                window.location.href = "main.html";
            },
            error: function(xhr) {
                const response = xhr.responseJSON;
                alert(response?.error || "Ошибка регистрации");
            }
        });
    });
});