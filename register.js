document.addEventListener("DOMContentLoaded", function () {
    const signupButton = document.getElementById("signup-button");
    const successModal = document.getElementById("success-modal");
    const loginModal = document.getElementById("login-modal");
    const validationModal = document.getElementById("validation-modal");
    const validationMessage = document.getElementById("validation-message");
    const verificationModal = document.getElementById("verification-modal");
    const verifyButton = document.getElementById("verify-button");
    const closeModalButtons = document.querySelectorAll(".close");
    const confirmButton = document.getElementById("confirm-button");
    const loginButton = document.getElementById("login-button");
    const togglePasswordIcons = document.querySelectorAll(".toggle-password");
    const passwordError = document.getElementById("password-error");
    const passwordInput = document.getElementById("password");
    const sendVerificationButton = document.getElementById("send-verification-button");
    const loginForm = document.getElementById("login-form");

    const API_URL = 'http://localhost:3000'; // Change this to your actual backend URL

    if (passwordInput && passwordError) {
        passwordInput.addEventListener("input", function () {
            if (passwordInput.value.length < 8) {
                passwordError.textContent = "Password must be at least 8 characters long!";
            } else {
                passwordError.textContent = "";
            }
        });
    }

    if (signupButton) {
        signupButton.addEventListener("click", async function () {
            // Clear all previous error messages
            const errorElements = document.querySelectorAll('.error-message');
            errorElements.forEach(element => element.textContent = '');
    
            const fullname = document.getElementById("fullname").value;
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm-password").value;
            const email = document.getElementById("email").value;
            const role = document.getElementById("role").value;
            const verificationCode = document.getElementById("verification-code").value;
    
            let hasError = false;

            if (!role || role === "I am") {
                document.getElementById("role-error").textContent = "Please select your role";
                hasError = true;
            }
    
            if (!fullname) {
                document.getElementById("fullname-error").textContent = "Full name is required";
                hasError = true;
            }
    
            if (!username) {
                document.getElementById("username-error").textContent = "Username is required";
                hasError = true;
            }
    
            if (!password) {
                document.getElementById("password-error").textContent = "Password is required";
                hasError = true;
            } else if (password.length < 8) {
                document.getElementById("password-error").textContent = "Password must be at least 8 characters long";
                hasError = true;
            }
    
            if (!confirmPassword) {
                document.getElementById("confirm-password-error").textContent = "Please confirm your password";
                hasError = true;
            } else if (password !== confirmPassword) {
                document.getElementById("confirm-password-error").textContent = "Passwords do not match";
                hasError = true;
            }
    
            if (!email) {
                document.getElementById("email-error").textContent = "Email is required";
                hasError = true;
            }
    
            if (!verificationCode) {
                document.getElementById("verification-code-error").textContent = "Verification code is required";
                hasError = true;
            }
    
            if (hasError) return;
    
            // Continue with verification and signup process
            try {
                const verifyResponse = await fetch(`${API_URL}/verify-code`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, code: verificationCode }),
                });
    
                const verifyData = await verifyResponse.json();
    
                if (!verifyData.success) {
                    document.getElementById("verification-code-error").textContent = "Invalid or expired verification code";
                    return;
                }
    
                // Updated signup process
                try {
                    const signupResponse = await fetch(`${API_URL}/signup`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            FULLNAME: fullname,
                            USERNAME: username,
                            PASSWORD: password,
                            EMAIL: email,
                            ROLE: role
                        })
                    });
    
                    const signupData = await signupResponse.json();
    
                    if (signupResponse.ok) {
                        showToast("Signup successful! Please login.", "success");
                        document.getElementById("login-modal").style.display = "block";
                    } else {
                        if (signupData.field === 'username') {
                            document.getElementById("username-error").textContent = signupData.message;
                        } else {
                            showToast(signupData.message || "Registration failed", "error");
                        }
                    }
                } catch (error) {
                    console.error('Signup error:', error);
                    showToast("An error occurred during signup. Please try again.", "error");
                }
            } catch (error) {
                document.getElementById("verification-code-error").textContent = error.message;
            }
        });
    }

    if (sendVerificationButton) {
        sendVerificationButton.addEventListener("click", async () => {
            const email = document.getElementById("email").value;
    
            if (!email) {
                showToast("Please enter your email address.", "error");
                return;
            }
    
            try {
                const response = await fetch(`${API_URL}/send-verification-code`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email }),
                });
    
                const data = await response.json();
    
                if (data.success) {
                    showToast("Verification code sent to your email!", "success");
                } else {
                    showToast("Failed to send verification code.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("An error occurred while sending the verification code.", "error");
            }
        });
    }

    closeModalButtons.forEach(button => {
        button.addEventListener("click", function () {
            successModal.style.display = "none";
            loginModal.style.display = "none";
            validationModal.style.display = "none";
            verificationModal.style.display = "none";
        });
    });

    if (confirmButton && loginModal && successModal) {
        confirmButton.addEventListener("click", function () {
            successModal.style.display = "none";
            loginModal.style.display = "block";
        });
    }

    window.addEventListener("click", function (event) {
        if ([successModal, loginModal, validationModal, verificationModal].includes(event.target)) {
            successModal.style.display = "none";
            loginModal.style.display = "none";
            validationModal.style.display = "none";
            verificationModal.style.display = "none";
        }
    });

    if (loginButton && loginModal) {
        loginButton.addEventListener("click", function () {
            loginModal.style.display = "block";
        });
    }

    //Countdown for verification code
    const sendButton = document.getElementById('send-verification-button');
    let countdown = 60; // seconds

    sendButton.addEventListener('click', () => {
        sendVerificationCode();

        // Disable button
        sendButton.disabled = true;
        let originalText = sendButton.textContent;
        sendButton.textContent = `Resend in ${countdown}s`;

        const interval = setInterval(() => {
            countdown--;
            sendButton.textContent = `Resend in ${countdown}s`;

            if (countdown <= 0) {
                clearInterval(interval);
                sendButton.disabled = false;
                sendButton.textContent = originalText;
                countdown = 60; // reset for future use
            }
        }, 1000);
    });

    function sendVerificationCode() {
        // Replace this with actual logic to send the code
        console.log('Verification code sent');
    }

    togglePasswordIcons.forEach(icon => {
        icon.addEventListener("click", function () {
            const targetId = this.getAttribute("data-target");
            const targetInput = document.getElementById(targetId);
            
            if (targetInput) {
                // Toggle password visibility
                const type = targetInput.getAttribute("type") === "password" ? "text" : "password";
                targetInput.setAttribute("type", type);
                
                // Toggle icon
                if (type === "text") {
                    this.classList.remove("fa-eye");
                    this.classList.add("fa-eye-slash");
                } else {
                    this.classList.remove("fa-eye-slash");
                    this.classList.add("fa-eye");
                }
            }
        });
    });

    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const username = document.getElementById("login-username").value;
            const password = document.getElementById("login-password").value;

            fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    USERNAME: username, PASSWORD: password
                })
            })
                .then(response => {
                    if (response.ok) return response.json(); // ✅ this parses it as JSON
                    else throw new Error('Invalid username or password.');
                })
                .then(data => {
                    console.log('Login successful:', data);

                    localStorage.setItem('user', JSON.stringify(data.user));

                    if (data.role === 'Student') {
                        window.location.href = 'student.html';
                    } else {
                        window.location.href = 'Professor.html';
                    }

                    console.log(data.role);
                })
                .catch(error => {
                    alert(error.message);
                });
        });
    }
});

function showToast(message, type = 'success') {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    
    // Set color based on type
    toast.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
    
    // Show toast
    toast.classList.add("show");
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
