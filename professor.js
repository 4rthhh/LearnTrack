const userData = [
    userName = '',
    userEmail = ''
]

const classData = [];
let fetchedClasses = [];
let currentStudents = [];
let announcementData = [];
let classCode = [];


// ===== CORE FUNCTIONS ===== //

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    const userData = localStorage.getItem('user')

    if (userData) {

        const user = JSON.parse(userData)

        document.getElementById('userName').textContent = user.FULL_NAME;
        document.getElementById('userEmail').textContent = user.EMAIL;
        document.getElementById('userEmailDisplay').textContent = user.EMAIL;

        userName = user.USERNAME;
        userEmail = user.EMAIL;
    }

    // Initialize UI
    showContent('dashboard');

    // Load initial data
    renderClasses();

    const viewAllBtn = document.getElementById('viewAllBtn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            if (currentStudents.length > 0) {
                viewAllStudents(currentStudents);
            } else {
                alert('No students yet!');
            }
        });
    }

    // Initialize workclasses

    //renderWorkClasses doesn't work in this version so i commented it out.
    // renderWorkclasses();

    //Dashboard
    updateActiveCourses();
    updateSectionCount();
    updateStudentCount();
    fetchProfilePicture(userName);

        document.getElementById('sortFeed').addEventListener('change', function() {
        loadAnnouncements(announcementData);
    });

    // Set up modal button
    // document.querySelector('.modal-btn-create').addEventListener('click', createClass);

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (event) {
        if (!event.target.matches('.profile-button') &&
            !event.target.closest('.profile-dropdown')) {
            const dropdowns = document.querySelectorAll('.dropdown-content');
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === document.getElementById('createClassModal')) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    checkUrlForClass();
  });

// Bind the Enter key to the Post button
document.addEventListener('keydown', function (event) {
    // Check if the Enter key is pressed and the announcement text area is focused
    const announcementText = document.getElementById('announcementText');
    if (event.key === 'Enter' && announcementText === document.activeElement) {
        event.preventDefault(); // Prevent default Enter behavior (e.g., new line)
        postAnnouncement(); // Trigger the postAnnouncement function
    }
});

function showContent(section, event) {
    showLoading();
  
    // Hide all content sections
    document.querySelectorAll('.content').forEach(content => {
      content.style.display = 'none';
    });
  
    // Show selected section
    setTimeout(() => {
      document.getElementById(section).style.display = 'block';
      hideLoading();
  
      if (section === 'classes') {
        renderClasses();
      }
    }, 500);
  }

function clearModalInputs() {
    const inputs = document.querySelectorAll('#createClassModal .modal-input');
    inputs.forEach(input => {
        input.value = '';
    });
}

function openModal() {
    clearModalInputs();
    document.getElementById('createClassModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('createClassModal').style.display = 'none';
}

async function createClass() {
    showLoading();

    const inputs = document.querySelectorAll('#createClassModal .modal-input');
    const className = inputs[0].value.trim();
    const section = inputs[1].value.trim();
    const teacherName = inputs[2].value.trim();

    if (!className) {
        hideLoading();
        showToast("Class name cannot be empty!", "error");
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.USERNAME) {
        hideLoading();
        showToast("User session not found. Please login again.", "error");
        return;
    }

    const newClass = {
        USERNAME: user.USERNAME,
        CLASS_NAME: className,
        CLASS_CODE: generateClassCode(),
        SECTION: section || 'N/A',
        NAME: teacherName || user.FULL_NAME || 'N/A',
    };
    

    try {
        const response = await fetch('http://localhost:3000/create-class', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newClass)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await response.json();
        
        // Close modal
        closeModal();
        
        // Update UI only once without Promise.all
        await renderClasses(); // Call renderClasses only once
        
        // Update counts synchronously after renderClasses
        updateActiveCourses();
        updateSectionCount();

        showToast('Class created successfully!', 'success');
    } catch (error) {
        console.error('Error creating class:', error);
        showToast('Failed to create class. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteClass(classCode) {
    const confirmDelete = confirm(`Are you sure you want to delete class with code: ${classCode}?`);
    if (!confirmDelete) return;

    showLoading();

    try {
        const response = await fetch(`http://localhost:3000/delete-class/${classCode}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete class');
        }

        await response.json();

        // Refresh the class list after deletion
        await renderClasses();
    } catch (error) {
        console.error('Error deleting class:', error);
    } finally {
        hideLoading();
    }
}

// Function to render classes
async function renderClasses() {
    showSkeletonLoader(); // Assuming this shows a loading indicator

    try {
        const user = JSON.parse(localStorage.getItem("user")); // Retrieve user data from localStorage
        const username = user?.USERNAME;

        const response = await fetch(`http://localhost:3000/classes?username=${username}`);
        if (!response.ok) {
            throw new Error('Failed to fetch classes');
        }

        fetchedClasses = await response.json(); // Parse the JSON response

        const container = document.getElementById('classContainer');
        container.innerHTML = ''; // Clear any existing content

        if (fetchedClasses.length === 0) {
            container.innerHTML = '<p class="no-classes">No classes found</p>';
            return;
        }

        // Loop through the fetched classes and display them
        fetchedClasses.forEach((cls) => {
            const classBox = document.createElement('div');
            classBox.classList.add('class-box');
            classBox.innerHTML = `
                <section class="class-info">
                    <h3>${cls.CLASS_NAME}</h3> <!-- Use correct property names from DB -->
                    <p>Section: ${cls.SECTION || "N/A"}</p>
                    <p>Teacher: ${cls.NAME || "N/A"}</p>
                    
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteClass('${cls.CLASS_CODE}')">Delete</button>
                </section>
                <section class="class-actions"></section>
            `;

            // Pass the class object directly to openClassPage when the class card is clicked
            classBox.querySelector('.class-info').addEventListener('click', async () => {
                openClassPage(cls); // Pass the full class object to openClassPage
                announcementData = await fetchAnnouncements(cls.CLASS_CODE);
                loadAnnouncements(announcementData); // Load announcements into the UI
            });

            container.appendChild(classBox);
        });
    } catch (error) {
        console.error('Error fetching classes:', error);
        const container = document.getElementById('classContainer');
        container.innerHTML = '<p class="error-message">Failed to load classes. Please try again later.</p>';
    }
}


// Loading States
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showSkeletonLoader() {
    const container = document.getElementById('classContainer');
    container.innerHTML = `
        <div class="class-box skeleton-card" style="height: 250px;"></div>
        <div class="class-box skeleton-card" style="height: 250px;"></div>
        <div class="class-box skeleton-card" style="height: 250px;"></div>
    `;
}

function updateActiveCourses() {
    const user = JSON.parse(localStorage.getItem("user")); // if stored as object
    const username = user?.USERNAME;

    fetch(`http://localhost:3000/active-courses?username=${username}`) // Replace with your actual endpoint
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Assuming the response has a key 'activeCourses'
            const count = data.activeCourses || 0;
            document.getElementById('active-course-count').textContent = count;
        })
        .catch(error => {
            console.error('Error fetching active courses:', error);
        });
}

function updateSectionCount() {
    const user = JSON.parse(localStorage.getItem("user")); // if stored as object
    const username = user?.USERNAME;

    fetch(`http://localhost:3000/section-count?username=${username}`) // Replace with your actual endpoint
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Assuming the response has a key 'activeCourses'
            const count = data.sectionsHandled || 0;
            document.getElementById('section-count').textContent = count;
        })
        .catch(error => {
            console.error('Error fetching section count:', error);
        });
}

// Enhanced Class Page Functions
function openClassPage(classData) {
    // Update class info
    document.getElementById('classNameDisplay').textContent = classData.CLASS_NAME;
    document.getElementById('sectionDisplay').textContent = classData.SECTION || 'N/A';
    document.getElementById('professorDisplay').textContent = classData.NAME || 'You';

    // Generate random class code
    document.getElementById('classCodeDisplay').textContent = classData.CLASS_CODE;

    // Show class page
    document.querySelectorAll('.content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById('classPage').style.display = 'block';

    // Add responsive check
    if (window.innerWidth < 768) {
        document.querySelector('.sidebar').style.width = '60px';
    }

    // Load initial data
    loadAnnouncements();
    updateStudentAvatars(classData.STUDENTS || []);
    
    // Initialize tabs - force workclasses to load
    openClassTab('workclasses');
    document.querySelector('.tab-button.active').click();
}

// Add window resize listener
window.addEventListener('resize', function () {
    if (document.getElementById('classPage').style.display === 'block') {
        if (window.innerWidth < 768) {
            document.querySelector('.sidebar').style.width = '60px';
        } else {
            document.querySelector('.sidebar').style.width = '250px';
        }
    }
});

function updateStudentAvatars(classId, students) {
    // Check if 'students' is null, undefined, or not an array
    if (!students || !Array.isArray(students)) {
        console.warn(`Invalid students data for class with ID: ${classId}`);
        return;
    }

    // Clear the avatars container to prevent leftover avatars from previous classes
    const avatarsContainer = document.getElementById('studentAvatars');
    avatarsContainer.innerHTML = '';  // Clear any previous avatars

    // If no students are present in this class
    if (students.length === 0) {
        console.warn(`No students have joined the class with ID: ${classId}`);
        // Show a default message or an empty state if no students are present
        avatarsContainer.innerHTML = '<p>No students have joined yet.</p>';
        return;
    }

    const studentCount = document.querySelector('.student-count');
    studentCount.textContent = `(${students.length})`;

    let avatarsHTML = '';
    const maxAvatars = 20;

    // Loop through and display avatars for the students of the current class
    students.slice(0, maxAvatars).forEach(student => {
        avatarsHTML += `
            <div class="student-avatar" title="${student.NAME}">
                <img src="default-avatar.png" alt="${student.NAME}">
            </div>
        `;
    });

    // Show "+X" counter if there are more students
    if (students.length > maxAvatars) {
        avatarsHTML += `<div class="more-students">+${students.length - maxAvatars}</div>`;
    }

    // Add "Add Student" button
    avatarsHTML += `
        <div class="empty-avatar" onclick="showAddStudents()">
            <i class="fas fa-user-plus"></i>
        </div>
    `;

    avatarsContainer.innerHTML = avatarsHTML;
}

function getAvatarInitials(name) {
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
}

function showAddStudents() {
    const classCode = document.getElementById('classCodeDisplay').textContent;
    alert(`Share this class code with students: ${classCode}\n\nStudents can join using this code.`);
}

function generateClassCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function copyClassCode() {
    const code = document.getElementById('classCodeDisplay').textContent;
    navigator.clipboard.writeText(code);
    alert('Class code copied to clipboard!');
}

// Handle file upload
function handleFileUpload(event) {
    const fileInput = event.target;
    const fileName = fileInput.files[0]?.name || "No file chosen";
    const fileNameDisplay = document.getElementById('fileName');

    fileNameDisplay.textContent = fileName;
    if (fileInput.files[0]) {
        fileNameDisplay.classList.add('has-file');
    } else {
        fileNameDisplay.classList.remove('has-file');
    }
}

// Open Google Drive Picker
function openGoogleDrivePicker() {
    alert("Google Drive integration would open here");
    // Add Google Picker API integration here if needed
}

// Add YouTube video
function addYouTubeVideo() {
    const videoUrl = prompt("Enter YouTube video URL:");
    if (videoUrl) {
        if (videoUrl.match(/youtube\.com|youtu\.be/)) {
            const announcementText = document.getElementById('announcementText');
            announcementText.value += `\n\nYouTube Video: ${videoUrl}`;
        } else {
            alert("Please enter a valid YouTube URL");
        }
    }
}

// Add a link
function addLink() {
    let linkUrl = prompt("Enter the link URL:");
    if (linkUrl) {
        // Ensure the link has a protocol (http:// or https://)
        if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
            linkUrl = "https://" + linkUrl;
        }

        // Display the link in the "No file chosen" area
        const fileNameDisplay = document.getElementById('fileName');
        fileNameDisplay.textContent = linkUrl;
        fileNameDisplay.classList.add('has-file');
    }
}

// Enhanced postAnnouncement function
async function postAnnouncement() {
    const text = document.getElementById('announcementText').value.trim();
    const fileInput = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileName').textContent;

    if (!text && fileNameDisplay === 'No file chosen') {
        alert('Please enter announcement text or attach a file/link');
        return;
    }

    // Prepare announcement data for backend
    const classCode = document.getElementById('classCodeDisplay').textContent;
    const newAnnouncement = {
        CLASS_CODE: classCode,
        NAME: userName,
        EMAIL: userEmail,
        CONTENT: text,
        DATE: new Date().toLocaleString(),
        // Add attachment/link handling here if your backend supports it
    };

    try {
        await createAnnouncement(newAnnouncement);
        alert("Announcement posted!");
        // Always fetch from backend after posting
        await loadAnnouncementsFromBackend();
        resetForm();
    } catch (error) {
        console.error(error);
        alert("Failed to post announcement.");
    }
}

// Update the loadAnnouncements function to display links
function loadAnnouncements(announcementData) {
    const announcementsList = document.getElementById('announcementsList');
    announcementsList.innerHTML = '';

    if (!announcementData || announcementData.length === 0) {
        document.getElementById('noAnnouncements').style.display = 'flex';
        return;
    }

    document.getElementById('noAnnouncements').style.display = 'none';

    // Sort announcements
    const sortBy = document.getElementById('sortFeed').value;
    const sortedAnnouncements = [...announcementData];

    sortedAnnouncements.sort((a, b) => {
        // Parse the DATE field as a Date object for comparison
        const dateA = new Date(a.DATE);
        const dateB = new Date(b.DATE);
        if (sortBy === 'newest') {
            return dateB - dateA; // Newest first
        } else {
            return dateA - dateB; // Oldest first
        }
    });

// Display announcements
sortedAnnouncements.forEach(announcement => {
    const announcementElement = document.createElement('div');
    announcementElement.className = 'announcement-card card';
    announcementElement.dataset.id = announcement._id || announcement.id || ''; // Use MongoDB _id as fallback

        let announcementHTML = `
            <div class="announcement-header">
                <div class="announcement-author-avatar">
                    ${getAvatarInitials(announcement.NAME)}
                </div>
                <div>
                    <div class="announcement-author">${announcement.NAME}</div>
                    <div class="announcement-date">${announcement.DATE}</div>
                </div>
            <button class="delete-btn" onclick="deleteAnnouncement('${announcement._id}')">
                <i class="fas fa-trash"></i>
            </button>
            </div>
            <div class="announcement-content">
        `;

        if (announcement.CONTENT) {
            announcementHTML += `<p>${announcement.CONTENT}</p>`;
        }

        if (announcement.link) {
            announcementHTML += `<p><a href="${announcement.link}" target="_blank">${announcement.link}</a></p>`;
        }

        if (announcement.attachment) {
            announcementHTML += `
                <div class="attachment-preview">
                    <div class="attachment-icon">
                        <i class="fas ${getFileIcon(announcement.attachment.type)}"></i>
                    </div>
                    <div>
                        <div class="attachment-name">${announcement.attachment.name}</div>
                        <div class="attachment-size">${formatFileSize(announcement.attachment.size)}</div>
                    </div>
                </div>
            `;
        }

        announcementHTML += `</div>`;
        announcementElement.innerHTML = announcementHTML;
        announcementsList.appendChild(announcementElement);
    });
}

    async function deleteAnnouncement(id) {
        if (!id) return;

        if (!confirm("Are you sure you want to delete this announcement?")) return;

        try {
            const response = await fetch(`http://localhost:3000/delete-announcement/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove the announcement from the UI by reloading from the backend
                loadAnnouncementsFromBackend();
            } else {
                const data = await response.json();
                alert(data.message || "Failed to delete announcement.");
            }
        } catch (error) {
            alert("Server error while deleting announcement.");
            console.error(error);
        }
    }

    async function loadAnnouncementsFromBackend() {
    const classCode = document.getElementById('classCodeDisplay').textContent;
    try {
        const response = await fetch(`http://localhost:3000/show-announcements?CLASS_CODE=${classCode}`);
        const announcements = await response.json();
        loadAnnouncements(announcements); // This should render the list
    } catch (error) {
        console.error("Error loading announcements:", error);
    }
}

// Reset form after posting
function resetForm() {
    document.getElementById('announcementText').value = '';
    document.getElementById('fileUpload').value = '';
    document.getElementById('fileName').textContent = 'No file chosen';
    document.getElementById('fileName').classList.remove('has-file');
}

function getFileIcon(fileType) {
    if (fileType.includes('image')) return 'fa-image';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('word')) return 'fa-file-word';
    if (fileType.includes('excel')) return 'fa-file-excel';
    if (fileType.includes('powerpoint')) return 'fa-file-powerpoint';
    if (fileType.includes('zip')) return 'fa-file-archive';
    return 'fa-file';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Update file input display
document.getElementById('fileUpload').addEventListener('change', function (e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    document.getElementById('fileName').textContent = fileName;
});

// Add sorting functionality
document.getElementById('sortFeed').addEventListener('change', loadAnnouncements);

// Profile Functions
function toggleProfileDropdown() {
    document.getElementById('profileDropdown').classList.toggle('show');
}

// View All Students function
// function viewAllStudents(students) {
//     // Set the class title
//     const className = document.getElementById('classNameDisplay').textContent;
//     document.getElementById('allStudentsClassTitle').textContent = className;

//     // Hide current page and show all students page
//     document.getElementById('classPage').style.display = 'none';
//     document.getElementById('allStudentsPage').style.display = 'block';

//     // Render all students
//     renderAllStudents(students);
// }

function viewAllStudents(students) {
    // Use global currentStudents if students is not provided
    students = students || currentStudents;

    // Set the class title
    const className = document.getElementById('classNameDisplay').textContent;
    document.getElementById('allStudentsClassTitle').textContent = className;

    // Hide current page and show all students page
    document.getElementById('classPage').style.display = 'none';
    document.getElementById('allStudentsPage').style.display = 'block';

    // Render all students
    renderAllStudents(students);
}

function updateActiveCourses() {
    const user = JSON.parse(localStorage.getItem("user")); // if stored as object
    const username = user?.USERNAME;

    fetch(`http://localhost:3000/active-courses?username=${username}`) // Replace with your actual endpoint
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Assuming the response has a key 'activeCourses'
            const count = data.activeCourses || 0;
            document.getElementById('active-course-count').textContent = count;
        })
        .catch(error => {
            console.error('Error fetching active courses:', error);
        });
}

function updateSectionCount() {
    const user = JSON.parse(localStorage.getItem("user")); // if stored as object
    const username = user?.USERNAME;

    fetch(`http://localhost:3000/section-count?username=${username}`) // Replace with your actual endpoint
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Assuming the response has a key 'activeCourses'
            const count = data.sectionsHandled || 0;
            document.getElementById('section-count').textContent = count;
        })
        .catch(error => {
            console.error('Error fetching section count:', error);
        });
}

function updateStudentCount() {
    const user = JSON.parse(localStorage.getItem("user")); // if stored as object
    const username = user?.USERNAME;

    fetch(`http://localhost:3000/student-count?username=${username}`) // Replace with your actual endpoint
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Assuming the response has a key 'activeCourses'
            const count = data.uniqueStudents || 0;
            document.getElementById('total-student-count').textContent = count;
        })
        .catch(error => {
            console.error('Error fetching section count:', error);
        });
}



// Back to Class Page function
function backToClassPage() {
    document.getElementById('allStudentsPage').style.display = 'none';
    document.getElementById('classPage').style.display = 'block';
}

// Render all students in grid view
function renderAllStudents() {
    const gridContainer = document.getElementById('allStudentsGrid');
    gridContainer.innerHTML = '';

    currentStudents.forEach(student => {
        const studentCard = document.createElement('div');
        studentCard.className = 'student-card';
        studentCard.innerHTML = `
        <div class="student-card-avatar">
          <img src="${defaultPicture}" alt="${student.NAME}">
        </div>
        <div class="student-card-name">${student.NAME}</div>
      `;
        gridContainer.appendChild(studentCard);
    });
}

// Update the updateStudentAvatars function to include the student count:
function updateStudentAvatars(students) {
    currentStudents = students;

    const avatarsContainer = document.getElementById('studentAvatars');
    const studentCount = document.querySelector('.student-count');

    studentCount.textContent = `(${students.length})`;

    let avatarsHTML = '';
    const maxAvatars = 21; // Show 5 avatars by default

    // Display student avatars
    students.slice(0, maxAvatars).forEach(student => {
        avatarsHTML += `
              <div class="student-avatar" title="${student.NAME}">
                  <img src="${defaultPicture}" alt="${student.NAME}">
              </div>
          `;
    });

    // Show "+X" counter if there are more students
    if (students.length > maxAvatars) {
        avatarsHTML += `
              <div class="more-students" title="View all ${students.length} students">
                  +${students.length - maxAvatars}
              </div>
          `;
    }

    // Always keep the "Add Students" button
    avatarsHTML += `
          <div class="empty-avatar" onclick="showAddStudents()" title="Add students">
              <i class="fas fa-user-plus"></i>
          </div>
      `;

    avatarsContainer.innerHTML = avatarsHTML;

    // Make the "+X" counter clickable to view all students
    const moreStudents = document.querySelector('.more-students');
    if (moreStudents) {
        moreStudents.style.cursor = 'pointer';
        moreStudents.addEventListener('click', viewAllStudents);
    }
}

// Workclass functions
function openWorkclassModal() {
    // Check if we're in a class context
    const classPage = document.getElementById('classPage');
    if (classPage.style.display !== 'block') {
      alert("Please open a class first to create workclasses");
      return;
    }
    
    // Reset form
    document.getElementById('workclassNameInput').value = '';
    document.getElementById('workclassDescription').value = '';
    document.getElementById('workclassType').value = '';
    
    // Clear any previous selections
    document.querySelectorAll('.type-option').forEach(option => {
      option.classList.remove('selected');
    });
    
    // Show modal
    document.getElementById('workclassModal').style.display = 'block';
  }
  
  function closeWorkclassModal() {
    const modal = document.querySelector('.modal.show');
    if (modal) {
      modal.remove();
    }
  }

  // Helper function to show toast messages
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function copyWorkclassCode(code) {
    navigator.clipboard.writeText(code);
    alert('Workclass code copied to clipboard!');
  }
  

// Add this function to handle type selection
function selectWorkclassType(type) {
    // Remove selected class from all options
    document.querySelectorAll('.type-option').forEach(option => {
      option.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    event.currentTarget.classList.add('selected');
    
    // Set the hidden input value
    document.getElementById('workclassType').value = type;
  }

function signOut() {
  document.getElementById('signOutModal').classList.add('show');
  document.getElementById('signOutOverlay').classList.add('show');
}


function closeSignOutModal() {
  document.getElementById('signOutModal').classList.remove('show');
  document.getElementById('signOutOverlay').classList.remove('show');
}

function confirmSignOut() {
  localStorage.removeItem('user');
  showToast("Signed out successfully");

  // Delay redirect to allow toast to appear
  setTimeout(() => {
    window.location.href = 'register.html';
  }, 1500); // wait 1.5 seconds
}

// Add this function to handle tab switching
function openClassTab(tabName) {
    // Hide all tab contents
    document.querySelector('.announcements-feed').style.display = 'none';
    document.getElementById('workclassesTab').style.display = 'none';
    
    // Show selected tab content
    if (tabName === 'announcements') {
      document.querySelector('.announcements-feed').style.display = 'block';
    } else if (tabName === 'workclasses') {
      document.getElementById('workclassesTab').style.display = 'block';
      renderClassWorkclasses();
    }
  
    // Update active tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.remove('active');
      if (button.textContent.toLowerCase().includes(tabName)) {
        button.classList.add('active');
      }
    });
  }

  async function renderClassWorkclasses() {
    const classCode = document.getElementById('classCodeDisplay').textContent;
    const container = document.getElementById('classWorkclassesContainer');
    
    // Clear container and add the grid container
    container.innerHTML = `
      <div class="workclass-grid-container">
        <div id="workclassList"></div>
      </div>
    `;
  
    const workclassList = document.getElementById('workclassList');
  
    try {
      // Fetch workclasses from the server
      const response = await fetch(`http://localhost:3000/get-workclasses?CLASS_CODE=${encodeURIComponent(classCode)}`);
      const workclasses = await response.json();
  
      if (!Array.isArray(workclasses) || workclasses.length === 0) {
        workclassList.innerHTML = `
          <div class="empty-state-card">
            <i class="fas fa-briefcase"></i>
            <h4>No workclasses yet</h4>
            <p>Create your first workclass</p>
          </div>
        `;
        return;
      }
  
      // Sort by creation date (newest first)
      workclasses.sort((a, b) => new Date(b.CREATED_AT) - new Date(a.CREATED_AT));
  
      // Render cards
      workclassList.innerHTML = workclasses.map(workclass => `
        <div class="workclass-card" data-id="${workclass._id}">
          <div class="workclass-card-header">
            <h3 class="workclass-card-title">${workclass.TITLE}</h3>
            <span class="workclass-card-type">
              ${getWorkclassTypeIcon(workclass.WORKCLASSTYPE)} ${workclass.WORKCLASSTYPE.charAt(0).toUpperCase() + workclass.WORKCLASSTYPE.slice(1)}
            </span>
          </div>
          <div class="workclass-card-body">
            ${workclass.INSTRUCTIONS ? `<p>${workclass.INSTRUCTIONS.substring(0, 150)}${workclass.INSTRUCTIONS.length > 150 ? '...' : ''}</p>` : ''}
          </div>
          <div class="workclass-card-footer">
            <div class="workclass-card-due">
              ${workclass.DUEDATE ? `Due: ${new Date(workclass.DUEDATE).toLocaleDateString()}` : 'No due date'}
            </div>
            <div class="workclass-card-actions">
              <button class="secondary-btn" onclick="viewWorkclass('${workclass._id}')">
                <i class="fas fa-eye"></i> View
              </button>
              <button class="delete-btn" onclick="deleteWorkclass('${classCode}', '${workclass._id}')">
                <i class="fas fa-trash"></i> Delete
              </button>
              <button class="end-workclass-btn" onclick="endWorkclassInOneDay('${workclass._id}', '${workclass.CLASS_CODE}')">

                <i class="fas fa-hourglass-end"></i> End in One Day
              </button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading workclasses:', error);
      workclassList.innerHTML = `<p style="color:red;">Failed to load workclasses. Please try again later.</p>`;
    }
  }
  

// Add this helper function to get class by code
function getClassByCode(classCode) {
    const classes = JSON.parse(localStorage.getItem('classes')) || [];
    return classes.find(cls => cls.CLASS_CODE === classCode);
}

// Update the createWorkclass function to associate with current class
function createWorkclass() {
    const name = document.getElementById('workclassNameInput').value.trim();
    const description = document.getElementById('workclassDescription').value.trim();
    const type = document.getElementById('workclassType').value;

    if (!name) {
        alert("Workclass name cannot be empty!");
        return;
    }

    if (!type) {
        alert("Please select a workclass type!");
        return;
    }

    showLoading();

    const classCode = document.getElementById('classCodeDisplay').textContent;

    const workclass = {
        id: Date.now(),
        name,
        description,
        type,
        createdAt: new Date().toISOString()
    };

    let stored = JSON.parse(localStorage.getItem(`workclasses_${classCode}`)) || [];
    stored.push(workclass);
    localStorage.setItem(`workclasses_${classCode}`, JSON.stringify(stored));

    closeWorkclassModal();
    renderClassWorkclasses();
    hideLoading();
}

// Add this function to delete a workclass from a class
function deleteClassWorkclass(classCode, workclassCode) {
    if (!confirm('Are you sure you want to delete this workclass?')) return;
    
    const classes = JSON.parse(localStorage.getItem('classes')) || [];
    const classIndex = classes.findIndex(cls => cls.CLASS_CODE === classCode);
    
    if (classIndex !== -1 && classes[classIndex].workclasses) {
        classes[classIndex].workclasses = classes[classIndex].workclasses.filter(
            wc => wc.code !== workclassCode
        );
        
        localStorage.setItem('classes', JSON.stringify(classes));
        renderClassWorkclasses();
    }
}

let workclasses = []; // Store workclasses data

async function viewWorkclass(workclassId) {
    try {
      // Show loading indicator
      showLoading();
  
      // Fetch workclass details from backend
      const response = await fetch(`http://localhost:3000/view-workclass/${workclassId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workclass details');
      }
  
      const workclass = await response.json();
  
      // Create and show modal with workclass details
      const modal = document.createElement('div');
      modal.className = 'modal show';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>${workclass.TITLE}</h3>
            <span class="workclass-type-badge ${workclass.WORKCLASSTYPE.toLowerCase()}-badge">
              ${getWorkclassTypeIcon(workclass.WORKCLASSTYPE)} ${workclass.WORKCLASSTYPE}
            </span>
          </div>
          <div class="workclass-details">
            <p>${workclass.INSTRUCTIONS || 'No description provided'}</p>
            <div class="workclass-meta">
              <span><i class="fas fa-calendar"></i> Due: ${workclass.DUEDATE ? new Date(workclass.DUEDATE).toLocaleDateString() : 'No due date'}</span>
              <span><i class="fas fa-users"></i> Submissions: ${workclass.SUBMISSIONS ? workclass.SUBMISSIONS.length : 0}</span>
            </div>
            ${workclass.attachments ? `
              <div class="attachments">
                <h4>Attachments</h4>
                <ul>
                  ${workclass.attachments.map(att => `
                    <li>
                      <i class="fas fa-paperclip"></i>
                      <span>${att.name}</span>
                      <a href="${att.url}" target="_blank" class="primary-btn">
                        <i class="fas fa-download"></i> Download
                      </a>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          <div class="modal-actions">
            <button onclick="closeWorkclassModal()" class="modal-btn modal-btn-cancel">Close</button>
            <button onclick="editWorkclass('${workclassId}')" class="modal-btn modal-btn-create">
              <i class="fas fa-edit"></i> Edit
            </button>
          </div>
        </div>
      `;
  
      // Add modal to body
      document.body.appendChild(modal);
  
    } catch (error) {
      console.error('Error viewing workclass:', error);
      showToast('Unable to load workclass details. Please try again.', 'error');
    } finally {
      hideLoading();
    }
  }

function displayWorkclassDetails(workclass) {
    // Create modal or dedicated view for workclass details
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>${workclass.name}</h3>
        <div class="workclass-details">
          <p>${workclass.description || 'No description provided'}</p>
          <div class="workclass-meta">
            <span>Type: ${workclass.type}</span>
            <span>Due: ${workclass.dueDate || 'No due date'}</span>
          </div>
          ${workclass.attachments ? `
            <div class="attachments">
              <h4>Attachments</h4>
              <ul>${workclass.attachments.map(a => `<li>${a.name}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
        <div class="modal-actions">
          <button onclick="closeWorkclassDetails()" class="modal-btn">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  function closeWorkclassDetails() {
    const modal = document.querySelector('.modal.show');
    if (modal) {
      modal.remove();
    }
  }

  function getWorkclassBadgeClass(type) {
    switch(type) {
      case 'assignment': return 'assignment-badge';
      case 'activity': return 'activity-badge';
      case 'question': return 'question-badge';
      case 'material': return 'material-badge';
      default: return '';
    }
  }

  function getWorkclassTypeIcon(type) {
    switch(type) {
      case 'assignment': return '<i class="fas fa-tasks"></i>';
      case 'question': return '<i class="fas fa-question-circle"></i>';
      case 'material': return '<i class="fas fa-book"></i>';
      default: return '';
    }
  }

  function openWorkclassTypePage(type) {
    const classCode = document.getElementById('classCodeDisplay').textContent;
    if (!classCode) {
      alert('No class selected.');
      return;
    }
  
    // Save the current class code to localStorage
    localStorage.setItem('currentClassCode', classCode);
  
    // Redirect based on type (remove quiz option)
    if (type === 'assignment') {
      window.location.href = 'assignment-form.html';
    } else if (type === 'activity') {
      window.location.href = 'activity-form.html';
    } else if (type === 'question') {
      window.location.href = 'question-form.html';
    } else if (type === 'material') {
      window.location.href = 'material-form.html';
    }
}
  
// Update the dropdown toggle function in professor.js
document.querySelector('.create-workclass-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('workclassDropdownOptions');
    dropdown.classList.toggle('show');
    
    // Reset positioning first
    dropdown.style.right = '100%';
    dropdown.style.left = 'auto';
    dropdown.style.top = '0';
    dropdown.style.marginRight = '5px';
    dropdown.style.marginLeft = '0';
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.workclass-dropdown')) {
        const dropdown = document.getElementById('workclassDropdownOptions');
        dropdown.classList.remove('show');
    }
});


async function deleteWorkclass(classCode, workclassId) {
  if (!confirm("Are you sure you want to delete this Workclass?")) return;

  try {
    const response = await fetch(`http://localhost:3000/delete-workclass/${classCode}/${workclassId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('Workclass deleted successfully!', 'success');
      await renderClassWorkclasses(); // Refresh the workclass list from backend
    } else {
      const data = await response.json();
      showToast(data.message || 'Failed to delete workclass.', 'error');
    }
  } catch (error) {
    showToast('Server error while deleting workclass.', 'error');
    console.error(error);
  }
}

  // Also update the related class's workclasses
//   let classes = JSON.parse(localStorage.getItem('classes')) || [];
//   const classCode = localStorage.getItem('currentClassCode');
//   const classIndex = classes.findIndex(c => c.CLASS_CODE === classCode);

//   if (classIndex !== -1) {
//     classes[classIndex].workclasses = classes[classIndex].workclasses.filter(id => id !== workclassId);
//     localStorage.setItem('classes', JSON.stringify(classes));
//   }

//   // Show success message
//   showToast('Workclass deleted successfully!', 'success');

//   // Refresh the page or re-render workclasses
//   loadWorkclasses();

function initializeResponsiveLayout() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const navbar = document.querySelector('.navbar');
    const allContents = document.querySelectorAll('.content');
    const allHeaders = document.querySelectorAll('.content-header');
    const body = document.body;

    function updateLayout(isCollapsed) {
        const isMobile = window.innerWidth <= 768;
        
        // Update all headers
        allHeaders.forEach(header => {
            if (isCollapsed) {
                header.style.left = '0';
                header.style.width = '100%';
            } else {
                header.style.left = isMobile ? '60px' : '250px';
                header.style.width = isMobile ? 'calc(100% - 60px)' : 'calc(100% - 250px)';
            }
        });

        // Update all content areas
        allContents.forEach(content => {
            if (isCollapsed) {
                content.style.marginLeft = '0';
            } else {
                content.style.marginLeft = isMobile ? '60px' : '250px';
            }
        });

        // Update navbar
        navbar.style.left = isCollapsed ? '0' : (isMobile ? '60px' : '250px');
        navbar.style.width = isCollapsed ? '98%' : (isMobile ? 'calc(98% - 60px)' : 'calc(98% - 250px)');
    }

    // Enhanced toggle sidebar handler
    function toggleSidebar() {
        hamburgerBtn.classList.toggle('active');
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('active');
        navbar.classList.toggle('expanded');
        body.classList.toggle('sidebar-open');
        
        const isCollapsed = sidebar.classList.contains('collapsed');
        sidebar.style.width = isCollapsed ? '0' : (window.innerWidth <= 768 ? '60px' : '250px');
        
        // Close dropdowns when sidebar is toggled
        if (!sidebar.classList.contains('active')) {
            const dropdowns = document.querySelectorAll('.dropdown-content');
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
        
        updateLayout(isCollapsed);
    }

    // Event Listeners
    hamburgerBtn.addEventListener('click', toggleSidebar);

    // Handle window resize
    window.addEventListener('resize', () => {
        const isCollapsed = sidebar.classList.contains('collapsed');
        updateLayout(isCollapsed);
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(event.target) && 
            !hamburgerBtn.contains(event.target) && 
            !sidebar.classList.contains('collapsed')) {
            toggleSidebar();
        }
    });

    // Close sidebar when clicking on content (mobile only)
    allContents.forEach(content => {
        content.addEventListener('click', function() {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                toggleSidebar();
            }
        });
    });

    // Initial layout setup
    updateLayout(sidebar.classList.contains('collapsed'));
}

// Update your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Initialize responsive layout
    initializeResponsiveLayout();
    
    // ... rest of your existing DOMContentLoaded code ...
});

// Add this function to handle fullscreen toggling
function toggleFullscreen() {
    const btn = document.querySelector('.fullscreen-btn');
    const icon = btn.querySelector('i');

    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');
            btn.classList.add('active');
        });
    } else {
        document.exitFullscreen().then(() => {
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
            btn.classList.remove('active');
        });
    }
}

// Add event listener for fullscreen changes
document.addEventListener('fullscreenchange', () => {
    const btn = document.querySelector('.fullscreen-btn');
    const icon = btn.querySelector('i');
    
    if (!document.fullscreenElement) {
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
        btn.classList.remove('active');
    }
});

function cleanupWorkclasses() {
    const classes = JSON.parse(localStorage.getItem('classes')) || [];
    const allWorkclasses = JSON.parse(localStorage.getItem('workclasses')) || [];
    
    // Get all referenced workclass IDs
    const referencedIds = classes.flatMap(c => c.workclasses || []);
    
    // Filter out workclasses not referenced by any class
    const validWorkclasses = allWorkclasses.filter(w => referencedIds.includes(w.id));
    
    localStorage.setItem('workclasses', JSON.stringify(validWorkclasses));
}

function saveQuizAndRedirect(quizData) {
    showLoading();
    
    const classCode = localStorage.getItem('currentClassCode');
    const type = localStorage.getItem('currentWorkclassType');
    
    const workclass = {
        id: Date.now(),
        classCode: classCode,
        title: quizData.title,
        description: quizData.description,
        type: type,
        questions: quizData.questions,
        pointsPossible: quizData.pointsPossible,
        dueDate: quizData.dueDate,
        createdAt: new Date().toISOString()
    };

    // Save to localStorage
    let workclasses = JSON.parse(localStorage.getItem('workclasses')) || [];
    workclasses.push(workclass);
    localStorage.setItem('workclasses', JSON.stringify(workclasses));
    
    // Update class reference
    let classes = JSON.parse(localStorage.getItem('classes')) || [];
    const classIndex = classes.findIndex(c => c.CLASS_CODE === classCode);
    if (classIndex !== -1) {
        if (!classes[classIndex].workclasses) {
            classes[classIndex].workclasses = [];
        }
        classes[classIndex].workclasses.push(workclass.id);
        localStorage.setItem('classes', JSON.stringify(classes));
    }
    
    // Clean up temporary storage
    localStorage.removeItem('currentClassCode');
    localStorage.removeItem('currentWorkclassType');
    
    // Redirect back to professor page
    window.location.href = 'professor.html';
}

function checkUrlForClass() {
    const urlParams = new URLSearchParams(window.location.search);
    const classCode = urlParams.get('class');
    
    if (classCode) {
      // Find the class in localStorage
      const classes = JSON.parse(localStorage.getItem('classes')) || [];
      const classData = classes.find(c => c.CLASS_CODE === classCode);
      
      if (classData) {
        openClassPage(classData);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    checkUrlForClass();
  });

function backToClasswork() {
  renderClassWorkclasses(); // re-renders the original Classwork list
}

function postWorkclassComment(workclassId) {
  const input = document.getElementById('newWorkclassComment');
  const commentText = input.value.trim();
  if (!commentText) {
    alert('Please write a comment.');
    return;
  }

  let comments = JSON.parse(localStorage.getItem(`workclassComments_${workclassId}`)) || [];

  comments.push({
    id: Date.now(),
    author: 'Professor', // Later dynamic based on user
    text: commentText,
    createdAt: new Date().toISOString()
  });

  localStorage.setItem(`workclassComments_${workclassId}`, JSON.stringify(comments));
  input.value = '';
  loadWorkclassComments(workclassId);
}

function loadWorkclassComments(workclassId) {
  const container = document.getElementById('workclassCommentsList');
  container.innerHTML = '';

  const comments = JSON.parse(localStorage.getItem(`workclassComments_${workclassId}`)) || [];

  if (comments.length === 0) {
    container.innerHTML = '<p>No comments yet.</p>';
    return;
  }

  comments.forEach(comment => {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
      <strong>${comment.author}</strong> <small>${new Date(comment.createdAt).toLocaleString()}</small>
      <p>${comment.text}</p>
    `;
    container.appendChild(div);
  });
}


function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

class DataService {
    static getClasses() {
        return JSON.parse(localStorage.getItem('classes')) || [];
    }

    static saveClass(classData) {
        const classes = this.getClasses();
        const existingIndex = classes.findIndex(c => c.CLASS_CODE === classData.CLASS_CODE);
        
        if (existingIndex >= 0) {
            classes[existingIndex] = classData;
        } else {
            classes.push(classData);
        }
        
        localStorage.setItem('classes', JSON.stringify(classes));
        return classData;
    }

    static getWorkclasses() {
        return JSON.parse(localStorage.getItem('workclasses')) || [];
    }

    static saveWorkclass(workclass) {
        const workclasses = this.getWorkclasses();
        const existingIndex = workclasses.findIndex(w => w.id === workclass.id);
        
        if (existingIndex >= 0) {
            workclasses[existingIndex] = workclass;
        } else {
            workclasses.push(workclass);
        }
        
        localStorage.setItem('workclasses', JSON.stringify(workclasses));
        return workclass;
    }
}

// todo
async function loadClassWorkForGrading() {
    const classCode = document.getElementById('classSelect').value;
    const workclassGradingList = document.getElementById('workclassGradingList');

    workclassGradingList.innerHTML = '<p>Loading workclasses...</p>';

    try {
        const response = await fetch(`http://localhost:3000/get-workclasses?CLASS_CODE=${classCode}`);
        if (!response.ok) {
            throw new Error('Failed to fetch workclasses');
        }

        const workclasses = await response.json(); // Get workclasses from backend

        workclassGradingList.innerHTML = ''; // Clear loading message

        if (workclasses.length === 0) {
            workclassGradingList.innerHTML = '<p>No workclasses available for grading.</p>';
            return;
        }

        workclasses.forEach(workclass => {
            const workclassItem = document.createElement('div');
            workclassItem.classList.add('workclass-item');
            workclassItem.innerHTML = `
                <h4>${workclass.TITLE || workclass.title}</h4>
                <button onclick="loadStudentSubmissions('${workclass._id || workclass.id}')">View Submissions</button>
            `;
            workclassGradingList.appendChild(workclassItem);
        });

    } catch (error) {
        console.error('Error loading workclasses:', error);
        workclassGradingList.innerHTML = '<p class="error-message">Failed to load workclasses. Please try again later.</p>';
    }
}

function showSettings() {
    // Hide all other content sections
    document.querySelectorAll('.content').forEach(content => {
      content.style.display = 'none';
    });
    
    // Show settings section
    document.getElementById('settings').style.display = 'block';
  }
  
  function switchSettingsTab(tab) {
    // Remove active class from all tabs
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelectorAll('.settings-tab').forEach(content => {
      content.classList.remove('active');
    });
    
    // Add active class to selected tab
    document.querySelector(`button[onclick="switchSettingsTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}Settings`).classList.add('active');
  }
  
  function uploadProfilePicture() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('profilePreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  // Function to switch between sections in rankings
function switchSection(sectionId) {
    // Remove active class from all section items
    document.querySelectorAll('.class-list li').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected section
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    
    // Update podium and rankings list for the selected section
    updateRankings(sectionId);

}

// Function to update rankings display
async function updateRankings(sectionId) {
    const podium = document.querySelector('.podium');
    const rankingsList = document.querySelector('.rankings-list');

    // Clear existing content
    podium.innerHTML = '';
    rankingsList.innerHTML = '';

    try {
        const res = await fetch(`http://localhost:3000/rankings/${encodeURIComponent(sectionId)}`);
        const rawRankings = await res.json();
    
        if (!Array.isArray(rawRankings) || rawRankings.length === 0) {
            rankingsList.innerHTML = '<p>No rankings available for this section.</p>';
            return;
        }
    
        const rankingsMap = new Map();
    
        rawRankings.forEach(entry => {
            const key = entry.name;
            const existing = rankingsMap.get(key);
    
            if (existing) {
                existing.score += entry.score;
            } else {
                rankingsMap.set(key, {
                    name: entry.name,
                    score: entry.score,
                    avatar: entry.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(entry.name)}`
                });
            }
        });
    
        // Convert map back to array and sort by score
        const rankings = Array.from(rankingsMap.values()).sort((a, b) => b.score - a.score);
    
        // Create podium for top 3
        createPodium(rankings.slice(0, 3));
    
        // Create full rankings list
        createRankingsList(rankings);
    } catch (error) {
        console.error("Failed to fetch rankings:", error);
        rankingsList.innerHTML = '<p>Error loading rankings.</p>';
    }
    

}

// Helper function to create podium display
function createPodium(topThree) {
    const podium = document.querySelector('.podium');
    const positions = [2, 1, 3]; // Order for visual display (2nd, 1st, 3rd)
    
    positions.forEach((pos, index) => {
        const student = topThree[pos - 1];
        if (student) {
            const pedestal = document.createElement('div');
            pedestal.className = `pedestal rank-${pos}`;
            pedestal.innerHTML = `
                <div class="student-avatar">
                    <img src="${student.avatar || 'default-avatar.png'}" alt="${student.name}">
                </div>
                <div class="student-name">${student.name}</div>
                <div class="student-score">${student.score}pts</div>
            `;
            podium.appendChild(pedestal);
        }
    });
}

// Helper function to create rankings list
function createRankingsList(rankings) {
    const rankingsList = document.querySelector('.rankings-list');
    
    rankings.forEach((student, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-item';
        rankItem.innerHTML = `
            <div class="rank-position">${index + 1}</div>
            <div class="student-info">
                <img src="${student.avatar || 'default-avatar.png'}" alt="${student.name}">
                <span>${student.name}</span>
            </div>
            <div class="student-score">${student.score}pts</div>
        `;
        rankingsList.appendChild(rankItem);
    });
}

// Add event listeners when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user')
    const user = JSON.parse(userData)   

    try {
        const res = await fetch(`http://localhost:3000/classes?username=${encodeURIComponent(user.USERNAME)}`);
        const classes = await res.json();

        const classListElement = document.getElementById('classList');
        classListElement.innerHTML = ""; // Clear existing

        // Create <li> elements for each class
        classes.forEach((cls, index) => {
            const li = document.createElement('li');
            li.textContent = cls.CLASS_NAME; // or cls.sectionName if available
            li.setAttribute('data-section', cls.CLASS_CODE);
            if (index === 0) li.classList.add('active');
            classListElement.appendChild(li);
        });

        // Add click handlers to dynamically created elements
document.querySelectorAll('.class-list li').forEach(item => {
    item.addEventListener('click', async () => {
        document.querySelectorAll('.class-list li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        const sectionId = item.getAttribute('data-section');

        try {
            const res = await fetch(`http://localhost:3000/rankings/${encodeURIComponent(sectionId)}`);
            const studentData = await res.json(); // should be an array of students with name & score

            switchSection(sectionId, studentData);

        } catch (err) {
            console.error("Failed to load rankings:", err);
        }
    });
});

    // Automatically initialize with the first section
        const firstSection = document.querySelector('.class-list li');
        if (firstSection) {
            switchSection(firstSection.getAttribute('data-section'));
        }

    } catch (error) {
        console.error("Failed to load classes:", error);
    }
});

// Sample data for classes and their workclasses
const sampleClasses = [
    {
        id: 1,
        name: "Web Development",
        section: "BSIT 3-1",
        workclasses: [
            {
                id: 101,
                name: "HTML Basics Quiz",
                type: "quiz",
                dueDate: "2025-05-01",
                submissions: [
                    { studentId: 1, studentName: "John Doe", submitted: true, grade: null },
                    { studentId: 2, studentName: "Jane Smith", submitted: true, grade: null },
                    { studentId: 3, studentName: "Mike Johnson", submitted: false, grade: null }
                ]
            },
            {
                id: 102,
                name: "CSS Project",
                type: "assignment",
                dueDate: "2025-05-05",
                submissions: [
                    { studentId: 1, studentName: "John Doe", submitted: true, grade: null },
                    { studentId: 2, studentName: "Jane Smith", submitted: false, grade: null },
                    { studentId: 3, studentName: "Mike Johnson", submitted: true, grade: null }
                ]
            }
        ]
    },
    {
        id: 2,
        name: "Database Management",
        section: "BSIT 3-2",
        workclasses: [
            {
                id: 201,
                name: "SQL Fundamentals",
                type: "quiz",
                dueDate: "2025-05-03",
                submissions: [
                    { studentId: 4, studentName: "Sarah Williams", submitted: true, grade: null },
                    { studentId: 5, studentName: "Tom Brown", submitted: true, grade: null },
                    { studentId: 6, studentName: "Emily Davis", submitted: true, grade: null }
                ]
            }
        ]
    }
];

// Function to populate class dropdown
async function populateClassDropdown() {
    const classSelect = document.getElementById('classSelect');
    classSelect.innerHTML = '<option value="" disabled selected>Select a class</option>';

    const response = await fetch(`http://localhost:3000/classes?username=${userName}`);
    if (!response.ok) {
        throw new Error('Failed to fetch classes');
    }

    fetchedClasses = await response.json();
    
    fetchedClasses.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.CLASS_CODE;
        option.textContent = `${classItem.CLASS_NAME} - ${classItem.SECTION}`;
        classSelect.appendChild(option);
    });
}


// Function to load student submissions for a workclass
async function loadStudentSubmissions(workclassId) {
    const gradingList = document.getElementById('studentGradingList');
    const classCode = document.getElementById('classSelect').value;

    gradingList.innerHTML = '<p>Loading...</p>';

    try {
        // Modify the fetch request to include both workclassId and classCode
        const response = await fetch(`http://localhost:3000/get-submissions-by-classcode/${encodeURIComponent(classCode)}/${encodeURIComponent(workclassId)}`);
        if (!response.ok) throw new Error('Failed to fetch submissions');
        
        const submissions = await response.json();
        gradingList.innerHTML = '';

        if (submissions.length === 0) {
            gradingList.innerHTML = '<p>No submissions available for grading.</p>';
            return;
        }

        submissions.forEach(submission => {
            const submissionElement = document.createElement('div');
            submissionElement.className = 'student-submission';

            // Use BASE64DATA or submission URL if applicable
            const viewButton = submission.SUBMITTED === true
              ? `<button class="view-submission-btn" onclick="openInBrowser('${submission.BASE64DATA}')">
                   <i class="fas fa-external-link-alt"></i> View Submission
                 </button>`
              : '';
          
            submissionElement.innerHTML = `
              <div class="student-info">
                  <h4>${submission.FULL_NAME}</h4>
                  <p>Status: ${submission.SUBMITTED === true ? 'Submitted' : 'Not Submitted'}</p>
              </div>
              ${submission.SUBMITTED === true ? `
                <div class="grading-inputs">
                    ${viewButton}
                    <input type="number" min="0" max="100" placeholder="Enter grade" 
                           value="${submission.GRADE || ''}"
                           onchange="saveGrade('${workclassId}', '${submission._id}', '${submission.FULL_NAME}','${submission.STUDENTUSERNAME}', this.value)">
                    <button class="grade-btn">Save Grade</button>
                </div>
              ` : ''}
            `;
          
            gradingList.appendChild(submissionElement);
          });
          

    } catch (error) {
        console.error('Error loading submissions:', error);
        gradingList.innerHTML = '<p>Error loading submissions.</p>';
    }
}

function openInBrowser(base64Data) {
    const win = window.open();
    win.document.write(`
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            iframe {
              width: 100%;
              height: 100vh;
              border: none;
              display: block;
              background-color: transparent;
            }
          </style>
        </head>
        <body>
          <iframe src="${base64Data}" allowfullscreen></iframe>
        </body>
      </html>
    `);
  }

// Function to save grade
async function saveGrade(workclassId, submissionId, studentFullName, studentUsername, grade) {
    const classCode = document.getElementById('classSelect').value;
    try {
        const response = await fetch('http://localhost:3000/save-grade', {
            method: 'POST', // changed from PUT to POST
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                classCode,
                workclassId,
                submissionId, // include if your backend expects it
                studentUsername,
                studentFullName,
                grade,  
                gradedAt: new Date().toISOString(),
            }),
        });

        if (!response.ok) throw new Error('Failed to save grade');

        const result = await response.json();
        alert(`Grade created successfully for ${result.studentFullName}`);

        const statusElement = document.querySelector(`#status-${submissionId}`);
        if (statusElement) {
            statusElement.textContent = `Status: Graded (${grade})`;
        }

    } catch (error) {
        console.error('Error saving grade:', error);
        alert('Failed to create grade. Please try again.');
    }
}

// Add event listener to load classes when the grading page is shown
document.addEventListener('DOMContentLoaded', () => {
    populateClassDropdown();
});

function endClassInOneDay() {
    const classId = getCurrentClassId(); // You'll need to implement this to get current class ID
    
    // Show confirmation dialog
    if (confirm('Are you sure you want to end this class in 24 hours? Students will be notified.')) {
        // Calculate end time (24 hours from now)
        const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Show success message
        alert(`Class will end on ${endTime.toLocaleString()}`);
        
        // Here you would typically:
        // 1. Update the class status in your database
        // 2. Send notifications to students
        // 3. Update the UI to reflect the pending end time
        
        // Add a countdown timer to the class header
        const classHeader = document.querySelector('#classNameDisplay');
        const endingBadge = document.createElement('span');
        endingBadge.className = 'ending-badge';
        endingBadge.innerHTML = `<i class="fas fa-clock"></i> Ending in 24h`;
        classHeader.appendChild(endingBadge);
    }
}

function endWorkclassInOneDay(workclassId, classCode) {
    if (confirm('Are you sure you want to end this workclass in 24 hours? Students will be notified.')) {
        const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Show the ending badge
        const badge = document.querySelector(`#endingBadge-${workclassId}`);
        // badge.style.display = 'flex';
        
        // Start countdown
        // updateCountdown(workclassId, endTime);
        
        // Store the end time (you might want to save this to your backend)
        localStorage.setItem(`workclass-${workclassId}-endTime`, endTime.getTime());
        
        // Send email notification to students
        sendEndOfWorkclassEmailNotification(workclassId, classCode);
    }
}

// Function to send the email notification to students
async function sendEndOfWorkclassEmailNotification(workclassId, classCode) {
    const payload = {
        workclassId: workclassId, 
        classCode: classCode, 
    };

    try {
        const response = await fetch('http://localhost:3000/send-email-in-one-day', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // Wait for the response to be processed
        const data = await response.json();
        
        if (response.ok) {
            console.log(data.message); // Handle success
        } else {
            console.error('Failed to send email:', data.error); // Handle error from the backend
        }
    } catch (error) {
        console.error('Error sending email:', error); // Handle any network or other errors
    }
}

// function updateCountdown(workclassId, endTime) {
//     const badge = document.querySelector(`#endingBadge-${workclassId} .countdown`);
    
//     const timer = setInterval(() => {
//         const now = new Date().getTime();
//         const distance = endTime - now;
        
//         const hours = Math.floor(distance / (1000 * 60 * 60));
//         const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
//         if (distance < 0) {
//             clearInterval(timer);
//             badge.parentElement.innerHTML = '<i class="fas fa-check"></i> Ended';
//             // Here you would typically handle the workclass ending
//         } else {
//             badge.textContent = `Ending in ${hours}h ${minutes}m`;
//         }
//     }, 1000);
// }

async function createAnnouncement(announcementData) {
    const response = await fetch("http://localhost:3000/create-announcements", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(announcementData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create announcement: ${errorText}`);
    }

    const result = await response.json();
    return result; // contains the message
}

async function fetchAnnouncements(classCode = null) {   
    const query = classCode ? `?CLASS_CODE=${encodeURIComponent(classCode)}` : "";
    const response = await fetch(`http://localhost:3000/show-announcements${query}`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch announcements: ${errorText}`);
    }

    const announcements = await response.json();

    renderClasses();

    return announcements;
}

// Add this to your JavaScript file
document.getElementById('profilePicInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size should be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            document.getElementById('profilePicPreview').src = e.target.result;
            uploadProfilePicture(base64Image, userName);

        };
        reader.readAsDataURL(file);
    }
});

// UPLOADING PICTURE TO DB
function uploadProfilePicture(base64Image, username) {
    fetch('http://localhost:3000/upload-profile-picture', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image, username: username }),
    })
    .then(response => response.json())
    .catch(error => {
        console.error('Error uploading image:', error);
    });
}

// Fetch profile picture and display it
function fetchProfilePicture(username) {
    fetch(`http://localhost:3000/get-profile-picture/${username}`)
        .then(response => response.json())
        .then(data => {
            if (data.PROFILE_PICTURE) {
                document.getElementById('profilePicPreview').src = data.PROFILE_PICTURE;
            } else {
                console.log(data.PROFILE_PICTURE);
                console.log("No profile picture found.");
            }
        })
        .catch(error => {
            console.error("Error fetching profile picture:", error);
        });
}

function createWorkclass(data) {
    const workclass = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      type: data.type,
      dueDate: data.dueDate,
      attachments: data.attachments || [],
      submissions: 0,
      createdAt: new Date().toISOString()
    };
    
    workclasses.push(workclass);
    // Save to local storage or your backend
    saveWorkclasses();
    return workclass;
  }
  
  function saveWorkclasses() {
    localStorage.setItem('workclasses', JSON.stringify(workclasses));
  }
  
  // Load workclasses when page loads
  function loadWorkclasses() {
    const saved = localStorage.getItem('workclasses');
    workclasses = saved ? JSON.parse(saved) : [];
  }
  
  // Call this when page loads
  document.addEventListener('DOMContentLoaded', loadWorkclasses);

  function showAddStudents() {
  document.getElementById('inviteStudentModal').classList.add('show');
  document.getElementById('inviteModalOverlay').classList.add('show');
}

function closeInviteModal() {
  document.getElementById('inviteStudentModal').classList.remove('show');
  document.getElementById('inviteModalOverlay').classList.remove('show');
}

async function sendStudentInvite() {
  const name = document.getElementById('studentName').value.trim();
  const email = document.getElementById('studentEmail').value.trim();
  const classCode = document.getElementById('classCodeDisplay').textContent;

  if (!name || !email || !/\S+@\S+\.\S+/.test(email)) {
    alert("Please enter a valid name and email.");
    return;
  }

  const payload = { name, email, classCode };

  try {
    const res = await fetch('http://localhost:3000/invite-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Failed to add Student");

    alert("Student Added successfully!");
    closeInviteModal();
  } catch (err) {
    console.error(err);
    alert("Failed to add student.");
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  document.getElementById('toastContainer').appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Toggle notification dropdown
document.querySelector('.notification-button').addEventListener('click', function (event) {
  event.stopPropagation(); // prevent closing immediately
  document.getElementById('notificationDropdown').classList.toggle('show');
});

// Close dropdown when clicking outside
window.addEventListener('click', function () {
  document.getElementById('notificationDropdown').classList.remove('show');
});

