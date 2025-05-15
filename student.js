let currentClass = null;
// Student-specific functionality
const studentData = {
    name: '',
    email: '',
    full_name: '',
    enrolledClasses: []
  };

  let userName = '';
  let userFullName = '';

  let classData = [];
  let classCode = '';
  let userClasses = [];
  let announcements = []; 
  let announcementData = [];
  let assignmentsCount = 0;

  const defaultPicture = 'https://static.thenounproject.com/png/209914-200.png';

  document.addEventListener('DOMContentLoaded', function() {
    // Load user data
    const user = JSON.parse(localStorage.getItem('user'));
    userName = JSON.parse(localStorage.getItem('user'));

    // Inject sample class if none exist
    if (user) {
      document.getElementById('userName').textContent = user.FULL_NAME || 'Student';
      document.getElementById('userEmail').textContent = user.EMAIL || 'student@example.com';
      document.getElementById('userEmailDisplay').textContent = user.EMAIL || 'student@example.com';
      
      studentData.name = user.NAME;
      window.studentName = user.NAME; 

      studentData.email = user.EMAIL;

      userFullName = user.FULL_NAME

      userName = user.USERNAME;
      window.userName = user.USERNAME;

      // Now load the profile settings dynamically
  loadProfileSettings({
    profilePicture: 'Picture/gmailprofile.png', // or use user.PROFILE_PICTURE if available
    fullName: user.FULL_NAME || 'Student',
    email: user.EMAIL || 'student@example.com'
    });
   } 
    
    fetchProfilePicture(userName);
    
    showJoinedClasses();

    // Load enrolled classes
    loadEnrolledClasses();
    
    // Initialize dashboard counts
    displayGrades();
    updateDashboardCounts();

    // Set up event listeners
    setupEventListeners();

    document.getElementById('sortFeed').addEventListener('change', function() {
      loadAnnouncements(classCode);
    });

  });
  
  async function loadEnrolledClasses() {
    const user = JSON.parse(localStorage.getItem("user"));
    const username = user?.USERNAME;
  
    const container = document.getElementById('classContainer');
    container.innerHTML = ''; // Clear existing content
  
    try {
      const response = await fetch(`http://localhost:3000/student-classes?username=${username}`);
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
  
      const enrolled = await response.json(); // Your array of class objects
      studentData.enrolledClasses = enrolled; // Save to global object
  
      if (enrolled.length === 0) {
        container.innerHTML = `
          <div class="empty-state-card">
            <i class="fas fa-book-open"></i>
            <h4>No classes yet</h4>
            <p>Join a class to get started</p>
            <button class="primary-btn" onclick="openJoinClassModal()">
              <i class="fas fa-plus"></i> Join Class
            </button>
          </div>
        `;
        return;
      }
  
      enrolled.forEach(cls => {
        const classBox = document.createElement('div');
        classBox.className = 'class-box';
        classBox.innerHTML = `
          <section class="class-info">
            <h3>${cls.CLASS_NAME}</h3>
            <p>Section: ${cls.SECTION || "N/A"}</p>
            <p>Professor: ${cls.NAME || "N/A"}</p>
          </section>
        `;

        classBox.addEventListener('click', () => openClassPage(cls));
        container.appendChild(classBox);
      });
  
    } catch (error) {
      console.error('Error loading classes:', error);
      container.innerHTML = `<p class="error-msg">Error loading classes. Please try again later.</p>`;
    }
  }  
  
  function openJoinClassModal() {
    const modal = document.getElementById('joinClassModal');
    const overlay = document.getElementById('modalOverlay');
  
    if (modal) modal.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
  
    document.getElementById('classCodeInput').focus();
  }
  
  // Sample grading data structure
const sampleGrades = {
  courses: [
    {
      id: "WD101",
      name: "Web Development",
      professor: "Dr. Smith",
      grades: [
        {
          type: "Assignment",
          name: "HTML Basics",
          score: 95,
          totalPoints: 100,
          dueDate: "2025-02-15",
          submitted: true
        },
        {
          type: "Quiz",
          name: "CSS Fundamentals",
          score: 88,
          totalPoints: 100,
          dueDate: "2025-03-01",
          submitted: true
        },
        {
          type: "Project",
          name: "Portfolio Website",
          score: 92,
          totalPoints: 100,
          dueDate: "2025-03-15",
          submitted: true
        }
      ],
      overallGrade: 91.67
    },
    {
      id: "DB201",
      name: "Database Management",
      professor: "Prof. Johnson",
      grades: [
        {
          type: "Quiz",
          name: "SQL Basics",
          score: 85,
          totalPoints: 100,
          dueDate: "2025-02-20",
          submitted: true
        },
        {
          type: "Assignment",
          name: "Database Design",
          score: 78,
          totalPoints: 100,
          dueDate: "2025-03-10",
          submitted: true
        },
        {
          type: "Midterm",
          name: "Database Concepts",
          score: null,
          totalPoints: 100,
          dueDate: "2025-05-10",
          submitted: false
        }
      ],
      overallGrade: 81.5
    }
  ]
};

// Function to display grades
async function displayGrades() {
  const gradesContainer = document.getElementById('gradesContainer');
  gradesContainer.innerHTML = ''; 

  const subjectAverages = {}; 

  try {
    const user = JSON.parse(localStorage.getItem('user'));
    userName = JSON.parse(localStorage.getItem('user'));
    userName = user.USERNAME;

    const response = await fetch(`http://localhost:3000/show-student-grades?username=${userName}`);
    const gradesData = await response.json();

    if (!gradesData || gradesData.length === 0) {
      gradesContainer.innerHTML = "<p>No grades found.</p>";
      return;
    }

    const gradesByCourse = {};

    gradesData.forEach(grade => {
      const courseCode = grade.CLASSCODE || "Unknown";
      const subject = grade.classDetails?.CLASS_NAME || "Unknown Subject";
      const professor = grade.classDetails?.NAME || "Unknown Professor";

      if (!gradesByCourse[courseCode]) {
        gradesByCourse[courseCode] = {
          subject,
          professor,
          grades: []
        };
      }

      gradesByCourse[courseCode].grades.push({
        title: grade.workclassDetails?.TITLE || "Untitled",
        type: grade.workclassDetails?.WORKCLASSTYPE || "Activity",
        score: grade.GRADE ?? null,
        total: grade.workclassDetails?.POINTSPOSSIBLE ?? null
      });
    });

    for (const [courseCode, courseData] of Object.entries(gradesByCourse)) {
      const courseElement = document.createElement('div');
      courseElement.className = 'course-grade-card';

      const gradesList = courseData.grades.map(grade => `
        <div class="grade-item ${grade.score === null ? 'pending' : ''}">
          <div class="grade-info">
            <span class="grade-type">${grade.type}</span>
            <span class="grade-name">${grade.title}</span>
          </div>
          <div class="grade-score">
            ${grade.score !== null ? `${grade.score}/${grade.total}` : 'Pending'}
          </div>
        </div>
      `).join('');

      // Calculate overall
      const submitted = courseData.grades.filter(g => g.score !== null && g.total !== null);
      const totalScore = submitted.reduce((sum, g) => sum + g.score, 0);
      const totalMax = submitted.reduce((sum, g) => sum + g.total, 0);
      const overall = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;

      // Store for dashboard use
      subjectAverages[courseData.subject] = {
        percentage: overall,
        totalScore,
        totalMax
      };

      courseElement.innerHTML = `
        <div class="course-header">
          <h3>${courseData.subject}</h3>
          <div class="course-meta">
            <span>${courseData.professor}</span>
            <span class="overall-grade">Overall: ${overall ?? 'N/A'}%</span>
          </div>
        </div>
        <div class="grades-list">
          ${gradesList}
        </div>
      `;

      gradesContainer.appendChild(courseElement);
    }

    updateDashboardStats(subjectAverages); // 👈 Send the subject-wise averages

  } catch (error) {
    console.error("Error fetching student grades:", error);
    gradesContainer.innerHTML = "<p>Error loading grades. Please try again later.</p>";
  }
}



// Function to update dashboard statistics
function updateDashboardStats(subjectAverages) {
  const subjects = Object.values(subjectAverages);

  const totalCourses = subjects.length;
  let totalAssignments = 0;
  let totalScore = 0;
  let totalMax = 0;

  subjects.forEach(subject => {
    totalScore += subject.totalScore;
    totalMax += subject.totalMax;
    // We can assume each assignment was worth >0
    totalAssignments += subject.totalMax > 0 ? subject.totalMax / 100 : 0; // or count from backend later
  });

  const averageGrade = totalMax > 0
    ? Math.round((totalScore / totalMax) * 100)
    : 0;

  document.getElementById('course-count').textContent = userClasses.length;
  document.getElementById('active-course-count').textContent = userClasses.length;
  document.getElementById('assignments-due-count').textContent = "—"; // Optional: pending count logic later
  document.getElementById('average-grade').textContent = `${averageGrade}%`;
}

  async function joinClass() {
    const classCode = document.getElementById('classCodeInput').value.trim().toUpperCase();

    if (!classCode || classCode.length < 5 || classCode.length > 8) {
        alert('Please enter a valid class code (5-8 characters)');
        return;
    }

    const userData = localStorage.getItem('user');
    
    if (!userData) {
        alert("User not logged in.");
        return;
    }

    const user = JSON.parse(userData);
    const student = {
        USERNAME: user.USERNAME,
        NAME: user.FULL_NAME
    };

    if (!student.USERNAME || !student.NAME) {
        alert("Missing student information.");
        return;
    }

    showLoading();

    try {
        const response = await fetch(`http://localhost:3000/join-class/${classCode}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ student })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error: ${errorText}`);
        }

        const result = await response.json();

        // Clear input
        document.getElementById('classCodeInput').value = '';

        // Update UI
        setTimeout(() => {
            showJoinedClasses(); // Refresh the class list
            // redirectToMyClassesSection(); // Navigate if needed
            showToast("Successfully joined the class!", "success");
            hideLoading();
        }, 500);
    } catch (error) {
        console.error('Error joining class:', error);
        alert('An error occurred while joining the class. ' + error.message);
        hideLoading();
    }
}
  
    let hasLoadedWork = false;  // Declare once globally

  function openClassPage(classData) {
    currentClass = classData; 
    classCode = classData.CLASS_CODE;

    hasLoadedWork = false; // ✅ Reset so new class data loads

    document.getElementById('classNameDisplay').textContent = classData.CLASS_NAME;
    document.getElementById('sectionDisplay').textContent = classData.SECTION || 'N/A';
    document.getElementById('professorDisplay').textContent = classData.NAME || 'N/A';

    document.querySelectorAll('.content').forEach(content => {
      content.style.display = 'none';
    });
    document.getElementById('classPage').style.display = 'block';

    openClassTab('announcements'); // Only one place to trigger loading
  }

  function openClassTab(tabName) {
    // Hide all tab content
    document.getElementById('announcementsTab').style.display = 'none';
    document.getElementById('workclassesTab').style.display = 'none';

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show the selected tab content and set button as active
    document.getElementById(tabName + 'Tab').style.display = 'block';
    document.querySelector(`button[onclick="openClassTab('${tabName}')"]`).classList.add('active');

    // Load content based on tab
    if (tabName === 'announcements') {
      loadAnnouncements(classCode); // <-- Always pass the current class code!
    } else if (tabName === 'workclasses') {
      loadClassWork();
    }
  }

// Fetch announcements from the backend
async function fetchAnnouncements(classCode) {
  const res = await fetch(`/announcements/${classCode}`);
  if (!res.ok) throw new Error('Failed to fetch announcements');
  return await res.json();
}

// Load and display announcements
async function loadAnnouncements(classCode) {
  const container = document.getElementById('announcementsList');
  container.innerHTML = ''; // Clear previous content

  try {
    // Fetch only announcements for the given classCode
    const announcementData = await fetchAnnouncements(classCode);
    console.log(announcementData); // Optional: Debugging

    if (!announcementData.length) {
      document.getElementById('noAnnouncements').style.display = 'flex';
      return;
    }

    document.getElementById('noAnnouncements').style.display = 'none';

    // Sort announcements
    const sortBy = document.getElementById('sortFeed').value;
    const sortedAnnouncements = [...announcementData];
    sortedAnnouncements.sort((a, b) => {
      const dateA = new Date(a.DATE);
      const dateB = new Date(b.DATE);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Render sorted announcements
    sortedAnnouncements.forEach(announcement => {
      const element = document.createElement('div');
      element.className = 'announcement-card card';
      element.innerHTML = `
        <div class="announcement-header">
          <div class="announcement-author-avatar">
            ${announcement.NAME?.charAt(0) || "?"}
          </div>
          <div>
            <div class="announcement-author">${announcement.NAME || "Unknown"}</div>
            <div class="announcement-date">${new Date(announcement.DATE).toLocaleString()}</div>
          </div>
        </div>
        <div class="announcement-content">
          <p>${announcement.CONTENT}</p>
        </div>
      `;
      container.appendChild(element);
    });
  } catch (error) {
    console.error('Error loading announcements:', error);
    container.innerHTML = `<p class="error-msg">Error loading announcements. Please try again later.</p>`;
  }
}
  
async function loadClassWork() {
  if (hasLoadedWork) return;
  hasLoadedWork = true;

  console.log("📘 Loading workclasses for:", classCode);

  const container = document.getElementById('classWorkclassesContainer');
  container.innerHTML = ''; // Clear previous content

  try {
    const response = await fetch(`http://localhost:3000/get-workclasses?CLASS_CODE=${encodeURIComponent(classCode)}`);
    if (!response.ok) throw new Error("Failed to fetch workclasses");

    const workclasses = await response.json();

    assignmentsCount = workclasses.length;

    if (workclasses.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <i class="fas fa-briefcase"></i>
          <h4>No work yet</h4>
          <p>Your professor hasn't assigned anything yet</p>
        </div>
      `;
      return;
    }

workclasses.forEach(workclass => {
  const rawDate = workclass.DUEDATE || workclass.ENDDATETIME || workclass.STARTDATETIME;
  const dueDate = rawDate ? new Date(rawDate) : null;

  // Attach DUEDATE as a Date for the helper functions
  workclass.DUEDATE = dueDate;

  // Find this student's submission
  const submission = (workclass.SUBMISSIONS || []).find(
    s => s.STUDENTUSERNAME === userName
  );

  // Determine STATUS for the helper functions
  workclass.STATUS = (submission && (submission.STATUS === "Turned In" || submission.SUBMITTED))
    ? "submitted"
    : "assigned";

  const studentStatus = getStatusText(workclass);
  const statusClass = getStatusClass(workclass);

  const dueDateString = (dueDate instanceof Date && !isNaN(dueDate))
    ? dueDate.toLocaleDateString()
    : "No Due Date";

  const element = document.createElement('div');
  element.className = `workclass-card ${workclass.WORKCLASSTYPE}`;
  element.innerHTML = `
    <div class="workclass-card-header">
      <h3 class="workclass-card-title">${workclass.TITLE}</h3>
      <span class="workclass-card-type">
        ${workclass.WORKCLASSTYPE.charAt(0).toUpperCase() + workclass.WORKCLASSTYPE.slice(1)}
      </span>
    </div>
    <div class="workclass-card-body">
      <p>Due: ${dueDateString}</p>
      <p>Status: <span class="submission-status ${statusClass}">
        ${studentStatus}
      </span></p>
    </div>
    <div class="workclass-card-footer">
      <button class="secondary-btn" onclick="viewWorkclass('${workclass._id}')">
        <i class="fas fa-eye"></i> View
      </button>
        </div>
  `;

  const viewButton = element.querySelector('.secondary-btn');
  viewButton.addEventListener('click', () => viewWorkclass(workclass._id));

  container.appendChild(element);
});

  } catch (error) {
    console.error("Error loading class work:", error);
    container.innerHTML = `<p class="error-text">Unable to load workclasses. Please try again later.</p>`;
  }
}
  
//TO POLISH
  function getStatusClass(workclass) {
    if (workclass.STATUS === 'submitted') return 'turned-in';

    const hasDueDate = !!workclass.DUEDATE;
    const now = Date.now();

    if (hasDueDate) {
      const dueTime = new Date(workclass.DUEDATE).getTime();
      if (dueTime < now) {
        return 'missing';
      }
      const dueSoon = dueTime - now < 2 * 24 * 60 * 60 * 1000; // less than 2 days
      return dueSoon ? 'due-soon' : 'assigned';
    }

    // No due date means it’s still assigned
    return 'assigned';
  }

  function getStatusText(workclass) {
    if (workclass.STATUS === 'submitted') return 'Turned in';

    const hasDueDate = !!workclass.DUEDATE;
    const now = Date.now();

    if (hasDueDate) {
      const dueTime = new Date(workclass.DUEDATE).getTime();
      if (dueTime < now) {
        return 'Missing';
      }
      const dueSoon = dueTime - now < 1 * 24 * 60 * 60 * 1000;
      return dueSoon ? 'Due soon' : 'Assigned';
    }

    // No due date
    return 'Assigned';
  }

  function getGradeClass(grade) {
    if (!grade) return '';
    const percent = parseFloat(grade);
    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 70) return 'C';
    if (percent >= 60) return 'D';
    return 'F';
  }
  
async function viewWorkclass(workclassId) {
  const response = await fetch(`http://localhost:3000/get-attachments-by-workclass/${workclassId}`);
  const data = await response.json();

  const w = data.workclass || {};
  const submission = (w.SUBMISSIONS || []).find(
  s => s.STUDENTUSERNAME === userName
  );

  const workclass = {
    id: w._id || workclassId,
    title: w.title || 'Sample Workclass',
    type: w.workclasstype || 'assignment',
    instructions: w.instructions || 'Complete the assigned readings and answer the questions.',
    dueDate: w.duedate ? new Date(w.duedate) : null,
    points: w.pointspossible ?? 'No Score',  // <-- Make sure the backend sends this as "pointspossible"
    status: (submission && (submission.STATUS === 'Turned In' || submission.SUBMITTED)) 
           ? 'submitted' 
           : 'assigned',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    submission: submission || null
};

  console.log("✅ Loaded workclass:", workclass); // Check what’s coming in

  // Now it's safe to update the DOM
  const container = document.getElementById('classWorkclassesContainer');

  const dueDate = workclass.dueDate instanceof Date && !isNaN(workclass.dueDate)
    ? `Due ${workclass.dueDate.toLocaleDateString()} at ${workclass.dueDate.toLocaleTimeString()}`
    : 'No Due Date';

  container.innerHTML = `
    <div class="workclass-detail-view">
      <div class="workclass-header">
        <button class="back-btn" onclick="loadClassWork()">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="workclass-header-content">
          <h1>${workclass.title}</h1>
          <div class="workclass-meta">
            <span class="workclass-type">
              <i class="fas ${workclass.type === 'assignment' ? 'fa-book' : 'fa-question-circle'}"></i>
              ${workclass.type.charAt(0).toUpperCase() + workclass.type.slice(1)}
            </span>
            <span class="points">${workclass.points} Points</span>
            <span class="due-date">${dueDate}</span>
          </div>
        </div>
      </div>
  
        <div class="workclass-body">
          <div class="instructions-card">
            <div class="instructions-content">
              <h2>Instructions</h2>
              <div class="instructions-text">
                ${workclass.instructions}
              </div>
            </div>
          </div>
  
<div class="attachments-card">
  <h2>Course Materials</h2>
  <div class="attachments-list">
    ${workclass.attachments && workclass.attachments.length > 0
      ? workclass.attachments.map(file => `
        <div class="attachment-item">
          <div class="attachment-icon">
            <i class="fas ${'png'}"></i>  <!-- Dynamically set the icon -->
          </div>
          <div class="attachment-details">
            <div class="attachment-name">${file.NAME}</div>
            <div class="attachment-meta">${formatSize(file.SIZE)} • ${new Date(file.uploadDate).toLocaleDateString()}</div>
          </div>
          <a href="${file.BASE64DATA}" class="download-btn" download="${file.NAME}">
            <i class="fas fa-download"></i> Download
          </a>
        </div>
      `).join('')
      : '<p class="no-attachments">No files attached</p>'}
  </div>
</div>
  
          ${workclass.status === 'assigned' ? `
            <div class="submission-card">
              <div class="submission-header">
                <h2>Your work</h2>
                <span class="status-badge not-submitted">Not submitted</span>
              </div>
              <div class="submission-content">
                <div class="file-upload-area" onclick="document.getElementById('workSubmission').click()">
                  <input type="file" id="workSubmission" hidden>
                  <div class="upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Click to add or drag files</p>
                    <span class="supported-formats">Supported formats: DOC, DOCX, PDF, TXT</span>
                  </div>
                </div>
                <div class="submission-files" id="submissionFileList"></div>
                <div class="submission-actions">
                  <button class="outline-btn" onclick="document.getElementById('workSubmission').click()">
                    <i class="fas fa-plus"></i> Add file
                  </button>
                  <button class="primary-btn" onclick="submitWork('${workclass.id}')" id="submitBtn" disabled>
                    <i class="fas fa-paper-plane"></i> Turn in
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <div class="submission-card">
              <div class="submission-header">
                <h2>Your work</h2>
                <span class="status-badge submitted">Turned in</span>
              </div>
              <div class="submission-content">
                <div class="submitted-files">
                  <div class="file-item">
                    <i class="fas fa-file-alt"></i>
                    <span>Your submission</span>
                    <span class="submission-time" id="submissionTime">Submitted ${new Date(workclass.submission?.submittedAt).toLocaleString()}</div>
                  </div>
                </div>
                <div class="submission-actions">
                  <button class="outline-btn" onclick="unsubmitWork('${workclass.id}')">
                    <i class="fas fa-undo"></i> Unsubmit
                  </button>
                </div>
              </div>
            </div>
          `}
        </div>
  
        <div class="workclass-sidebar">
          <div class="sidebar-card">
            <h3>Class comments</h3>
            <div class="comments-placeholder">
              <i class="fas fa-comments"></i>
              <p>No class comments yet</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
  const fileInput = document.getElementById('workSubmission');
  if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileList = document.getElementById('submissionFileList');
      fileList.innerHTML = `
        <div class="file-item">
          <i class="fas fa-file-alt"></i>
          <span>${file.name}</span>
        <button class="remove-file" onclick="removeFile()">
          <i class="fas fa-times"></i>
        </button>
        </div> `
      ;
      document.getElementById('submitBtn').disabled = false;
    }
  });
 }
}

  function removeFile() {
  // Clear the file input
  const fileInput = document.getElementById('workSubmission');
  if (fileInput) {
    fileInput.value = '';
  }
  // Clear the file list display
  const fileList = document.getElementById('submissionFileList');
  if (fileList) {
    fileList.innerHTML = '';
  }
  // Disable the submit button again
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
  }
}
  
  // Helper function to get the correct file icon based on file type
  function getFileIcon(fileType) {
    const icons = {
      pdf: 'fa-file-pdf',
      docx: 'fa-file-word',
      txt: 'fa-file-alt',
      // Add more as needed
    };
    return icons[fileType] || 'fa-file';
  }
  
  // Helper function to format file size (assuming size is in bytes)
  function formatSize(sizeInBytes) {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    else if (sizeInBytes < 1048576) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    else if (sizeInBytes < 1073741824) return `${(sizeInBytes / 1048576).toFixed(1)} MB`;
    else return `${(sizeInBytes / 1073741824).toFixed(1)} GB`;
  }
  
  
async function submitWork(workclassId) {
  const fileInput = document.getElementById('workSubmission');
  const file = fileInput?.files[0];

  if (!file) {
    alert("Please select a file to submit.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("workclassId", workclassId);
  formData.append("studentUsername", window.userName || userName);
  formData.append("studentName", window.studentName || userFullName);

  try {
    showLoading();

    const response = await fetch("http://localhost:3000/submit-work", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    console.log("Response status:", response.status);
    console.log("Returned message:", result.message);

    hideLoading();

    if (response.ok && result.message === 'Work submitted successfully') {
      showToast('Work submitted successfully!', 'success');

      const container = document.getElementById('classWorkclassesContainer');
      container.innerHTML = `
        <div class="workclass-detail-view">
          <button class="back-btn" onclick="loadClassWork()">
            <i class="fas fa-arrow-left"></i> Back to Classwork
          </button>

          <div class="workclass-details card">
            <div class="workclass-header">
              <h2>Work Submitted</h2>
            </div>

            <div class="workclass-section">
              <p>Your work has been submitted successfully.</p>
              <p>Submitted file: ${file.name}</p>
              <p>Submitted on: ${new Date().toLocaleString()}</p>
            </div>

            <button class="primary-btn" onclick="loadClassWork()">
              <i class="fas fa-arrow-left"></i> Back to Classwork
            </button>
          </div>
        </div>
      `;
    } else {
      showToast(result.message || "There was an error submitting your work.", "error");
    }
  } catch (error) {
    hideLoading();
    console.error("Error submitting work:", error);
    showToast("An error occurred while submitting your work. Please try again.", "error");
  }
}
  
  async function updateDashboardCounts() {
    // Update basic counts from local studentData
    document.getElementById('course-count').textContent = userClasses.length;
    document.getElementById('active-course-count').textContent = userClasses.length;
  
    // Still static for now, unless you implement grade tracking
    document.getElementById('average-grade').textContent = '0%';
  
    try {

      const response = await fetch(`http://localhost:3000/student-workclasses-count/${userName}`);
      if (!response.ok) throw new Error("Failed to fetch student workclasses");
  
      const data = await response.json();
      const assignmentsCount = data.count;
  
      document.getElementById('assignments-due-count').textContent = assignmentsCount;
  
    } catch (error) {
      console.error("Error updating dashboard counts:", error);
    }
  }  
  
  
  function showContent(section) {
    showLoading();
  
    // Hide all content sections
    document.querySelectorAll('.content').forEach(content => {
      content.style.display = 'none';
    });
  
    // Show selected section after short delay
    setTimeout(() => {
      document.getElementById(section).style.display = 'block';
      hideLoading();

      //errors
      // if (section === 'classes') {
      //   renderClasses();
      // } 
    }, 500);
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

  console.log(sectionId);
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
    const user = JSON.parse(localStorage.getItem("user"));
    const username = user?.USERNAME;

  console.log(user.USERNAME);

  try {
      const res = await fetch(`http://localhost:3000/student-classes?username=${username}`);
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

          console.log(studentData);
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
  
  
  function initializeResponsiveLayout() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const navbar = document.querySelector('.navbar');
    const allContents = document.querySelectorAll('.content');
    const allHeaders = document.querySelectorAll('.content-header');
    const body = document.body;

    function updateLayout(isCollapsed) {
        const isMobile = window.innerWidth <= 768;
        
        // Update headers
        allHeaders.forEach(header => {
            if (isCollapsed) {
                header.style.left = '0';
                header.style.width = '100%';
            } else {
                header.style.left = isMobile ? '60px' : '250px';
                header.style.width = isMobile ? 'calc(100% - 60px)' : 'calc(100% - 250px)';
            }
        });

        // Update content areas
        allContents.forEach(content => {
            content.style.marginLeft = isCollapsed ? '0' : (isMobile ? '60px' : '250px');
        });

        // Update navbar
        navbar.style.left = isCollapsed ? '0' : (isMobile ? '60px' : '250px');
        navbar.style.width = isCollapsed ? '95%' : (isMobile ? 'calc(95% - 60px)' : 'calc(98% - 250px)');
    }

    function toggleSidebar() {
        hamburgerBtn.classList.toggle('active');
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('active');
        navbar.classList.toggle('expanded');
        
        const isCollapsed = sidebar.classList.contains('collapsed');
        updateLayout(isCollapsed);
        
        // Close dropdowns when sidebar is toggled
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
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
            sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });

    // Initial layout setup
    updateLayout(sidebar.classList.contains('collapsed'));
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeResponsiveLayout();
    // ... your other initialization code ...
});
  
  function toggleProfileDropdown() {
    document.getElementById('profileDropdown').classList.toggle('show');
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
  window.location.href = 'register.html'; // or your login/homepage
}

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
  
  function showToast(message, type) {
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
  
  function openClassTab(tabName) {
    // Hide all tab content
    document.getElementById('announcementsTab').style.display = 'none';
    document.getElementById('workclassesTab').style.display = 'none';
  
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
  
    // Show the selected tab content and set button as active
    document.getElementById(tabName + 'Tab').style.display = 'block';
    document.querySelector(`button[onclick="openClassTab('${tabName}')"]`).classList.add('active');
  
    // Load content based on tab
    if (tabName === 'announcements') {
      loadAnnouncements();
    } else if (tabName === 'workclasses') {
      loadClassWork();
    }
  }
  
  function backToClasses() {
    document.getElementById('classPage').style.display = 'none';
    document.getElementById('classes').style.display = 'block';
  }
  
  function setupEventListeners() {
    // Set up any additional event listeners
    document.getElementById('classCodeInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        joinClass();
      }
    });
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
  
  function loadProfileSettings(data) {
  const formContainer = document.getElementById('profileForm');
  formContainer.innerHTML = `
    <div class="form-group">
      <label>Profile Picture</label>
      <div class="profile-upload">
        <img id="profilePreview" src="${data.profilePicture}" alt="Profile">
        <button class="secondary-btn" onclick="uploadProfilePicture()">Change Picture</button>
      </div>
    </div>
    <div class="form-group">
      <label>Full Name</label>
      <input type="text" id="fullName" value="${data.fullName}">
    </div>
    <div class="form-group">
      <label>Email</label>
      <input type="email" id="email" value="${data.email}" disabled>
    </div>
  `;
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
          document.getElementById('profilePicPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  // Add these helper functions
  function closeModal() {
  const modal = document.getElementById('joinClassModal');
  const overlay = document.getElementById('modalOverlay');

  if (modal) modal.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
}
  
  function openModal() {
    document.getElementById('joinClassModal').classList.add('show');
    document.getElementById('modalOverlay').classList.add('show');
  }
  
 
  function loadGrades() {
    const container = document.getElementById('gradesContainer');
    container.innerHTML = '';
  
    if (studentData.enrolledClasses.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <i class="fas fa-clipboard-list"></i>
          <h4>No grades yet</h4>
          <p>Join classes to see your performance</p>
        </div>
      `;
      return;
    }
  
    studentData.enrolledClasses.forEach(cls => {
      const gradeCard = document.createElement('div');
      gradeCard.className = 'grade-card';
  
      // Simulated grade
      const grade = Math.floor(Math.random() * 21) + 80;
  
      gradeCard.innerHTML = `
        <h3>${cls.name}</h3>
        <p><strong>Section:</strong> ${cls.section}</p>
        <p><strong>Professor:</strong> ${cls.professor}</p>
        <p><strong>Grade:</strong> <span class="grade-display">${grade}%</span></p>
      `;
  
      container.appendChild(gradeCard);
    });
  }

  async function showJoinedClasses() {
    const user = JSON.parse(localStorage.getItem("user"));
    const username = user?.USERNAME;

    const response = await fetch(`http://localhost:3000/student-classes?username=${username}`)
    if (!response.ok) {
        throw new Error('Failed to fetch classes');
    }

    const classes = await response.json(); // Parse the JSON response

    const container = document.getElementById('classContainer');

    userClasses = classes;

    updateDashboardCounts();

    if (classes.length === 0) {
        container.innerHTML = '<p class="no-classes">No classes found</p>';
        return;
    }
  }

  async function fetchAnnouncements(classCode = null) {   
    const query = classCode ? `?CLASS_CODE=${encodeURIComponent(classCode)}` : "";
    const response = await fetch(`http://localhost:3000/show-announcements?CLASS_CODE=${encodeURIComponent(classCode)}`);
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch announcements: ${errorText}`);
    }
  
    const announcements = await response.json();
  
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
          // Here you would typically upload the image to your server
          // uploadProfilePicture(file);
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
              document.getElementById('profilePicPreview').src = data.PROFILE_PICTURE; // main
              const settingsPreview = document.getElementById('profilePreview');
              if (settingsPreview) settingsPreview.src = data.PROFILE_PICTURE; // settings tab
          } else {
              console.log("No profile picture found.");
          }
      })
      .catch(error => {
          console.error("Error fetching profile picture:", error);
      });
}

function getFileIcon(fileType) {
  switch(fileType.toLowerCase()) {
    case 'pdf':
      return 'fa-file-pdf';
    case 'doc':
    case 'docx':
      return 'fa-file-word';
    case 'xls':
    case 'xlsx':
      return 'fa-file-excel';
    case 'ppt':
    case 'pptx':
      return 'fa-file-powerpoint';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'fa-file-image';
    default:
      return 'fa-file-alt';
  }
}

// Add these functions to student.js

async function viewAllStudents() {
  // Hide the class page and show all students page
  document.getElementById('classPage').style.display = 'none';
  document.getElementById('allStudentsPage').style.display = 'block';

  // Update the page title with current class name
  document.getElementById('allStudentsClassTitle').textContent = currentClass.CLASS_NAME;

  // Show loading state
  showLoading();

  try {
    // Fetch students for the current class
    const response = await fetch(`http://localhost:3000/class-students/${currentClass.CLASS_CODE}`);
    if (!response.ok) throw new Error('Failed to fetch students');
    
    const students = await response.json();
    
    // Get the container and clear it
    const container = document.getElementById('allStudentsGrid');
    container.innerHTML = '';

    // If no students, show empty state
    if (students.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <i class="fas fa-users"></i>
          <h4>No students yet</h4>
          <p>Share the class code with your students to get started</p>
        </div>
      `;
      hideLoading();
      return;
    }

    // Create and append student cards
    students.forEach(student => {
      const studentCard = document.createElement('div');
      studentCard.className = 'student-card';
      studentCard.innerHTML = `
        <div class="student-avatar">
         <img src="https://static.thenounproject.com/png/209914-200.png" alt="${student.NAME}">
        </div>
        <div class="student-info">
          <h4 class="student-name">${student.NAME}</h4>
        </div>
      `;
      container.appendChild(studentCard);
    });

    // Update student count in the class page
    const studentCount = document.querySelector('.student-count');
    if (studentCount) {
      studentCount.textContent = `(${students.length})`;
    }

  } catch (error) {
    console.error('Error loading students:', error);
    // Show error state
    document.getElementById('allStudentsGrid').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h4>Failed to load students</h4>
        <p>Please try again later</p>
      </div>
    `;
  } finally {
    hideLoading();
  }
  
}

function backToClassPage() {
  document.getElementById('allStudentsPage').style.display = 'none';
  document.getElementById('classPage').style.display = 'block';
}

// Update the openClassPage function to include student count
async function openClassPage(classData) {
  currentClass = classData;
  classCode = classData.CLASS_CODE;

  hasLoadedWork = false; // Reset flag here

  // Update UI...
  document.getElementById('classNameDisplay').textContent = classData.CLASS_NAME;
  document.getElementById('sectionDisplay').textContent = classData.SECTION || 'N/A';
  document.getElementById('professorDisplay').textContent = classData.NAME || 'N/A';

  document.querySelectorAll('.content').forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById('classPage').style.display = 'block';

  // Fetch students and update avatars (keep as is)
  try {
    const response = await fetch(`http://localhost:3000/class-students/${classCode}`);
    if (!response.ok) throw new Error('Failed to fetch students');
    const students = await response.json();

    const studentCount = document.querySelector('.student-count');
    if (studentCount) studentCount.textContent = `(${students.length})`;

    const avatarsContainer = document.getElementById('studentAvatars');
    avatarsContainer.innerHTML = '';

    students.slice(0, 5).forEach(student => {
      const avatar = document.createElement('div');
      avatar.className = 'student-avatar';
      avatar.innerHTML = `<img src="${defaultPicture}" alt="${student.NAME}">`;
      avatarsContainer.appendChild(avatar);
    });

    if (students.length > 5) {
      const moreAvatars = document.createElement('div');
      moreAvatars.className = 'more-students';
      moreAvatars.textContent = `+${students.length - 5}`;
      avatarsContainer.appendChild(moreAvatars);
    }
  } catch (error) {
    console.error('Error loading student count:', error);
  }

  // Load the announcements tab by default
  openClassTab('announcements'); 
  loadAnnouncements(classCode);

  // Don't call loadClassWork() here directly, 
  // let openClassTab handle it when switching to "workclasses" tab
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

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  document.getElementById('toastContainer').appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}