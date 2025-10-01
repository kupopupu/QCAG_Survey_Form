// Add edit buttons next to outlet items (if none exist)
document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll('.outlet-item, [data-outlet-id]');
    items.forEach(it => {
        if (it.querySelector('.user-edit-btn')) return;
        const id = it.getAttribute('data-outlet-id') || it.id || Math.random().toString(36).slice(2, 9);
        it.setAttribute('data-outlet-id', id);
        const btn = document.createElement('button');
        btn.className = 'user-edit-btn';
        btn.innerText = 'Chỉnh sửa';
        btn.onclick = () => openEditForm(id);
        it.appendChild(btn);
    });
});


// Data storage
let outlets = JSON.parse(localStorage.getItem('outlets')) || {};
let currentOutletCode = null;
let currentRequestId = null;
let currentUser = null;

// User accounts
const users = {
    'admin': {
        password: 'admin123',
        role: 'admin',
        name: 'Quản Trị Viên',
        permissions: ['view', 'create', 'edit', 'delete', 'upload', 'manage']
    }
};


// Authentication functions
function login(username, password) {
    const user = users[username];
    if (user && user.password === password) {
        currentUser = {
            username: username,
            ...user
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        return true;
    }
    return false;
}

function logout() {
    if (confirm('🚪 Bạn có chắc chắn muốn đăng xuất?')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('mainHeader').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('loginForm').reset();
    }
}

function checkPermission(permission) {
    return currentUser && currentUser.permissions.includes(permission);
}

function initializeUI() {
    if (!currentUser) return;

    // Show main interface
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('mainHeader').style.display = 'block';
    document.getElementById('searchFilterHeader').style.display = 'block';
    document.getElementById('mainContent').style.display = 'block';

    // Update user info
    const userInfo = document.getElementById('userInfo');
    let roleColor, roleIcon, displayText;

    if (currentUser.role === 'admin') {
        roleColor = 'bg-red-600 text-white';
        roleIcon = '🔧';
        displayText = `${currentUser.name} (Admin)`;
    } else if (currentUser.position === 'SR/TBA') {
        roleColor = 'bg-blue-600 text-white';
        roleIcon = '👤';
        displayText = `${currentUser.name} (SR/TBA)`;
    } else if (currentUser.position === 'SS') {
        roleColor = 'bg-green-600 text-white';
        roleIcon = '👥';
        displayText = `${currentUser.name} (SS)`;
    } else {
        roleColor = 'bg-gray-600 text-white';
        roleIcon = '●';
        displayText = currentUser.name;
    }

    userInfo.innerHTML = `
                <span class="${roleColor} px-2 py-1 rounded-full text-xs font-medium">
                    ${roleIcon} ${displayText}
                </span>
            `;

    // Update dashboard title
    const dashboardTitle = document.getElementById('dashboardTitle');
    dashboardTitle.textContent = currentUser.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard';

    // Show/hide create outlet button (only in main content area)
    const createOutletBtnDesktop = document.getElementById('createOutletBtnDesktop');
    const createOutletBtnMobile = document.getElementById('createOutletBtnMobile');
    if (checkPermission('create') || checkPermission('manage')) {
        if (createOutletBtnDesktop) createOutletBtnDesktop.style.display = 'block';
        if (createOutletBtnMobile) createOutletBtnMobile.style.display = 'block';
    } else {
        if (createOutletBtnDesktop) createOutletBtnDesktop.style.display = 'none';
        if (createOutletBtnMobile) createOutletBtnMobile.style.display = 'none';
    }

    // Load data
    loadOutletList();
}

// Check for existing session
function checkSession() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        initializeUI();
    } else {
        document.getElementById('loginModal').style.display = 'flex';
    }
}

// User form functions
function showUserForm() {
    document.getElementById('userFormModal').style.display = 'flex';
}

function hideUserForm() {
    document.getElementById('userFormModal').style.display = 'none';
    document.getElementById('userLoginForm').reset();

    // Reset role selection
    document.querySelectorAll('.role-button').forEach(btn => {
        btn.classList.remove('border-orange-500', 'bg-orange-100');
        btn.classList.add('border-gray-300', 'bg-gray-50');
    });

    // Reset role description to default
    document.getElementById('roleDescription').innerHTML = '<div class="text-gray-500 italic">Chọn chức vụ để xem mô tả...</div>';
}

function loginAsUser(fullName, email, role) {
    const permissions = role === 'SR/TBA' ? ['view', 'create', 'edit'] : ['view', 'edit']; // SS không được tạo yêu cầu mới

    currentUser = {
        username: email,
        role: role,
        name: fullName,
        email: email,
        position: role,
        permissions: permissions
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    initializeUI();

    const roleDescription = role === 'SR/TBA' ? 'Bạn có thể xem, tạo yêu cầu và comment chỉnh sửa.' : 'Bạn có thể xem và comment chỉnh sửa (không thể tạo yêu cầu mới).';
    alert(`✅ Chào mừng ${fullName}!\n\nChức vụ: ${role}\n${roleDescription}`);
}

// Role selection function
function selectRole(role) {
    // Reset all buttons
    document.querySelectorAll('.role-button').forEach(btn => {
        btn.classList.remove('border-orange-500', 'bg-orange-100');
        btn.classList.add('border-gray-300', 'bg-gray-50');
    });

    // Activate selected button
    const selectedBtn = role === 'SR/TBA' ? document.getElementById('roleBtn1') : document.getElementById('roleBtn2');
    selectedBtn.classList.remove('border-gray-300', 'bg-gray-50');
    selectedBtn.classList.add('border-orange-500', 'bg-orange-100');

    // Set hidden input value
    document.getElementById('userRole').value = role;

    // Update role description in fixed space
    const roleDescription = document.getElementById('roleDescription');

    if (role === 'SR/TBA') {
        roleDescription.innerHTML = `
                    <div class="text-blue-600 font-semibold text-sm">👤 Sale Representative / Territory Business Advisor</div>
                    <div class="text-gray-600 mt-2 text-xs leading-relaxed">Có thể xem outlet, tạo yêu cầu mới và gửi comment chỉnh sửa</div>
                `;
    } else if (role === 'SS') {
        roleDescription.innerHTML = `
                    <div class="text-green-600 font-semibold text-sm">👥 Sale Supervisor</div>
                    <div class="text-gray-600 mt-2 text-xs leading-relaxed">Có thể xem outlet và gửi comment chỉnh sửa (không tạo yêu cầu mới)</div>
                `;
    }
}

// User login form handler
document.getElementById('userLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const fullName = document.getElementById('userFullName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const role = document.getElementById('userRole').value;

    if (!fullName || !email || !role) {
        alert('❌ Vui lòng điền đầy đủ thông tin!');
        return;
    }

    hideUserForm();
    loginAsUser(fullName, email, role);
});

// Admin login form handler
document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const adminName = document.getElementById('adminName').value.trim();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    if (!adminName) {
        alert('❌ Vui lòng nhập họ và tên Admin!');
        return;
    }

    if (login(username, password)) {
        // Cập nhật tên admin
        currentUser.name = adminName;
        currentUser.displayName = adminName;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        initializeUI();
        alert(`✅ Đăng nhập Admin thành công!\n\nChào mừng ${adminName}! Bạn có toàn quyền quản lý hệ thống.`);
    } else {
        alert('❌ Sai tên đăng nhập hoặc mật khẩu Admin!\n\nVui lòng kiểm tra lại thông tin.');
        document.getElementById('adminPassword').value = '';
    }
});

// Initialize with sample data
if (Object.keys(outlets).length === 0) {
    outlets = {
        '12345678': {
            name: 'Quán Bia ABC',
            address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
            area: 'S4',
            requests: [{
                    id: 1,
                    requesterName: 'Nguyễn Văn A',
                    area: 'S4',
                    brand: 'Tiger',
                    address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
                    type: 'Bảng Hiệu',
                    width: 200,
                    height: 80,
                    content: 'QUÁN BIA ABC - TIGER BEER',
                    createdAt: '2024-01-15 14:30:00'
                },
                {
                    id: 2,
                    requesterName: 'Trần Thị B',
                    area: 'S5',
                    brand: 'Heineken',
                    address: '456 Nguyễn Trãi, Thanh Xuân, Hà Nội',
                    type: 'Hộp Đèn',
                    width: 150,
                    height: 60,
                    content: 'HEINEKEN - FRESH BEER',
                    createdAt: '2024-01-20 09:15:00'
                }
            ]
        }
    };
    saveData();
}

function saveData() {
    localStorage.setItem('outlets', JSON.stringify(outlets));
}

let filteredOutlets = {};

function filterOutlets() {
    const searchValue = document.getElementById('searchOutletCode').value.trim().toLowerCase();
    const filterArea = document.getElementById('filterArea').value;
    const filterStatus = document.getElementById('filterStatus').value;
    const sortBy = document.getElementById('sortBy').value;

    // Start with all outlets
    let filtered = Object.entries(outlets);

    // Apply search filter
    if (searchValue) {
        filtered = filtered.filter(([code, outlet]) => {
            return code.toLowerCase().includes(searchValue) ||
                outlet.name.toLowerCase().includes(searchValue);
        });
    }

    // Apply area filter
    if (filterArea) {
        filtered = filtered.filter(([code, outlet]) => outlet.area === filterArea);
    }

    // Apply status filter
    if (filterStatus) {
        filtered = filtered.filter(([code, outlet]) => {
            const requests = outlet.requests || [];
            const pendingCount = requests.filter(r => !r.completed).length;

            switch (filterStatus) {
                case 'completed':
                    return requests.length > 0 && pendingCount === 0;
                case 'pending':
                    return pendingCount > 0;
                case 'no-requests':
                    return requests.length === 0;
                default:
                    return true;
            }
        });
    }

    // Apply sorting
    filtered.sort(([codeA, outletA], [codeB, outletB]) => {
        switch (sortBy) {
            case 'code-desc':
                return codeB.localeCompare(codeA);
            case 'name-asc':
                return outletA.name.localeCompare(outletB.name);
            case 'name-desc':
                return outletB.name.localeCompare(outletA.name);
            case 'area-asc':
                return outletA.area.localeCompare(outletB.area);
            case 'pending-desc':
                const pendingA = (outletA.requests || []).filter(r => !r.completed).length;
                const pendingB = (outletB.requests || []).filter(r => !r.completed).length;
                return pendingB - pendingA;
            case 'code-asc':
            default:
                return codeA.localeCompare(codeB);
        }
    });

    // Convert back to object for display
    filteredOutlets = Object.fromEntries(filtered);

    // Update display
    displayFilteredOutlets();
    updateFilterInfo(filtered.length, Object.keys(outlets).length);
}

function displayFilteredOutlets() {
    const countElement = document.getElementById('outletCount');
    const countElementDesktop = document.getElementById('outletCountDesktop');
    const filteredEntries = Object.entries(filteredOutlets);

    // Update both mobile and desktop counters
    if (countElement) countElement.textContent = filteredEntries.length;
    if (countElementDesktop) countElementDesktop.textContent = filteredEntries.length;

    // Load Desktop Table
    loadOutletTable(filteredEntries);

    // Load Mobile Grid
    loadOutletGrid(filteredEntries);
}

function updateFilterInfo(filteredCount, totalCount) {
    const filterInfo = document.getElementById('filterInfo');

    if (filteredCount === totalCount) {
        filterInfo.style.display = 'none';
    } else {
        filterInfo.style.display = 'block';
        filterInfo.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                            📊 Hiển thị ${filteredCount}/${totalCount} outlet
                        </span>
                        ${filteredCount === 0 ? '<span class="text-orange-600">⚠️ Không tìm thấy outlet nào phù hợp với bộ lọc</span>' : ''}
                    </div>
                `;
    }
}

function clearFilters() {
    document.getElementById('searchOutletCode').value = '';
    document.getElementById('filterArea').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('sortBy').value = 'code-asc';

    // Reset to show all outlets
    filteredOutlets = outlets;
    loadOutletList();
}

function loadOutletList() {
    // Initialize filtered outlets with all outlets
    filteredOutlets = outlets;

    const countElement = document.getElementById('outletCount');
    const countElementDesktop = document.getElementById('outletCountDesktop');
    const outletEntries = Object.entries(outlets);

    // Update both mobile and desktop counters
    if (countElement) countElement.textContent = outletEntries.length;
    if (countElementDesktop) countElementDesktop.textContent = outletEntries.length;

    // Load Desktop Table
    loadOutletTable(outletEntries);

    // Load Mobile Grid
    loadOutletGrid(outletEntries);

    // Load pending outlets sidebar
    loadPendingOutlets();
}

function loadOutletTable(outletEntries) {
    const tbody = document.getElementById('outletTableBody');
    tbody.innerHTML = '';

    for (const [code, outlet] of outletEntries) {
        const totalRequests = outlet.requests ? outlet.requests.length : 0;
        const pendingRequests = outlet.requests ? outlet.requests.filter(r => !r.completed).length : 0;
        const needsEditCount = outlet.requests ? outlet.requests.filter(r => {
            return r.editHistory && r.editHistory.length > 0 &&
                r.editHistory.some(edit => !edit.isFixed);
        }).length : 0;

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 cursor-pointer transition-colors duration-200';
        row.onclick = () => viewOutletDetail(code);

        row.innerHTML = `
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div class="text-sm font-mono text-blue-600">${code}</div>
                    </td>
                    <td class="px-4 py-4">
                        <div class="text-sm font-semibold text-gray-900">${outlet.name}</div>
                        <div class="text-xs text-gray-500 truncate max-w-xs">${outlet.address || ''}</div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${outlet.area}
                        </span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-center">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            ${totalRequests}
                        </span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-center">
                        ${pendingRequests > 0 ? 
                            `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                ${pendingRequests}
                            </span>` : 
                            `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                0
                            </span>`
                        }
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center space-x-2">
                            <button onclick="event.stopPropagation(); viewOutletDetail('${code}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Xem chi tiết">
                                Xem
                            </button>
                            ${checkPermission('view') ? `
                                <button onclick="event.stopPropagation(); requestEditOutlet('${code}')" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Yêu cầu chỉnh sửa outlet">
                                    ✏️ Sửa
                                </button>
                                <button onclick="event.stopPropagation(); requestDeleteOutlet('${code}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Yêu cầu xóa outlet">
                                    🗑️ Xóa
                                </button>
                            ` : ''}
                            ${checkPermission('manage') ? `
                                <button onclick="event.stopPropagation(); adminEditOutlet('${code}')" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Admin chỉnh sửa outlet">
                                    🔧 Admin
                                </button>
                                <button onclick="event.stopPropagation(); deleteOutlet('${code}')" class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Xóa vĩnh viễn outlet">
                                    🗑️ Xóa VV
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                
                tbody.appendChild(row);
            }
        }

        function loadOutletGrid(outletEntries) {
            const container = document.getElementById('outletGridContainer');
            container.innerHTML = '';
            
            for (const [code, outlet] of outletEntries) {
                const totalRequests = outlet.requests ? outlet.requests.length : 0;
                const pendingRequests = outlet.requests ? outlet.requests.filter(r => !r.completed).length : 0;
                
                const card = document.createElement('div');
                card.className = 'bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-lg p-4 hover:shadow-lg cursor-pointer transition-all duration-300 hover:border-blue-400';
                card.onclick = () => viewOutletDetail(code);
                
                card.innerHTML = `
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1">
                            <h4 class="font-bold text-gray-800 text-sm mb-1 truncate">${outlet.name}</h4>
                            <p class="text-xs font-mono text-blue-600 mb-1">${code}</p>
                            <p class="text-xs text-gray-600">${outlet.area}</p>
                        </div>
                        <div class="flex flex-col items-end space-y-1">
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                                ${totalRequests}
                            </span>
                            ${pendingRequests > 0 ? 
                                `<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                                    ${pendingRequests}
                                </span>` : 
                                `<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                                    0
                                </span>`
                            }
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-200 pt-3">
                        <div class="flex items-center justify-between">
                            <button onclick="event.stopPropagation(); viewOutletDetail('${code}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs btn-hover transition-all duration-300 touch-btn">
                                Xem Chi Tiết
                            </button>
                            ${checkPermission('view') ? `
                                <div class="flex space-x-1">
                                    <button onclick="event.stopPropagation(); requestEditOutlet('${code}')" class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1.5 rounded text-xs btn-hover transition-all duration-300 touch-btn" title="Yêu cầu chỉnh sửa outlet">
                                        ✏️
                                    </button>
                                    <button onclick="event.stopPropagation(); requestDeleteOutlet('${code}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded text-xs btn-hover transition-all duration-300 touch-btn" title="Yêu cầu xóa outlet">
                                        🗑️
                                    </button>
                                </div>
                            ` : ''}
                            ${checkPermission('manage') ? `
                                <div class="flex space-x-1">
                                    <button onclick="event.stopPropagation(); adminEditOutlet('${code}')" class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1.5 rounded text-xs btn-hover transition-all duration-300 touch-btn" title="Admin chỉnh sửa outlet">
                                        🔧
                                    </button>
                                    <button onclick="event.stopPropagation(); deleteOutlet('${code}')" class="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1.5 rounded text-xs btn-hover transition-all duration-300 touch-btn" title="Xóa vĩnh viễn outlet">
                                        🗑️
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                
                container.appendChild(card);
            }
        }

        function loadPendingOutlets() {
            const pendingList = document.getElementById('pendingOutletsList');
            const pendingListDesktop = document.getElementById('pendingOutletsListDesktop');
            const pendingListOverlay = document.getElementById('pendingOutletsListOverlay');
            const countElement = document.getElementById('pendingOutletCount');
            const countElementDesktop = document.getElementById('pendingOutletCountDesktop');
            const countElementOverlay = document.getElementById('pendingOutletCountOverlay');
            const noOutletsElement = document.getElementById('noPendingOutlets');
            const noOutletsElementDesktop = document.getElementById('noPendingOutletsDesktop');
            const noOutletsElementOverlay = document.getElementById('noPendingOutletsOverlay');
            
            // Clear all lists (mobile, desktop, overlay)
            if (pendingList) pendingList.innerHTML = '';
            if (pendingListDesktop) pendingListDesktop.innerHTML = '';
            if (pendingListOverlay) pendingListOverlay.innerHTML = '';
            
            const pendingOutlets = [];
            
            // Find outlets with pending requests or requests needing edits
            for (const [code, outlet] of Object.entries(outlets)) {
                const allRequests = outlet.requests || [];
                const pendingRequests = allRequests.filter(r => !r.completed);
                
                // Tìm các yêu cầu cần chỉnh sửa (có editHistory và có edit chưa được fix)
                const needsEditRequests = allRequests.filter(r => {
                    if (!r.editHistory || r.editHistory.length === 0) return false;
                    
                    // Kiểm tra xem có edit nào chưa được fix không
                    return r.editHistory.some(edit => !edit.isFixed);
                });
                
                // Đếm riêng các yêu cầu đã hoàn thành nhưng cần sửa
                const completedButNeedsEdit = allRequests.filter(r => {
                    return r.completed && r.editHistory && r.editHistory.length > 0 && 
                           r.editHistory.some(edit => !edit.isFixed);
                });
                
                const totalIssues = pendingRequests.length + needsEditRequests.length;
                
                if (totalIssues > 0) {
                    // Find oldest issue (either pending request or unfixed edit)
                    let oldestIssue = null;
                    let oldestDate = null;
                    
                    // Check pending requests
                    if (pendingRequests.length > 0) {
                        const oldestPending = pendingRequests.sort((a, b) => parseVietnameseDate(a.createdAt) - parseVietnameseDate(b.createdAt))[0];
                        oldestIssue = { type: 'pending', request: oldestPending };
                        oldestDate = parseVietnameseDate(oldestPending.createdAt);
                    }
                    
                    // Check edit requests
                    if (needsEditRequests.length > 0) {
                        needsEditRequests.forEach(request => {
                            const unfixedEdits = request.editHistory.filter(edit => !edit.isFixed);
                            if (unfixedEdits.length > 0) {
                                const oldestEdit = unfixedEdits.sort((a, b) => parseVietnameseDate(a.timestamp) - parseVietnameseDate(b.timestamp))[0];
                                const editDate = parseVietnameseDate(oldestEdit.timestamp);
                                
                                if (!oldestDate || editDate < oldestDate) {
                                    oldestIssue = { type: 'edit', request: request, edit: oldestEdit };
                                    oldestDate = editDate;
                                }
                            }
                        });
                    }
                    
                    pendingOutlets.push({
                        code,
                        outlet,
                        pendingCount: pendingRequests.length,
                        editCount: needsEditRequests.length,
                        completedButNeedsEditCount: completedButNeedsEdit.length,
                        totalRequests: allRequests.length,
                        totalIssues: totalIssues,
                        oldestIssue: oldestIssue,
                        oldestDate: oldestDate
                    });
                }
            }
            
            // Update all counts (mobile, desktop, overlay)
            if (countElement) countElement.textContent = pendingOutlets.length;
            if (countElementDesktop) countElementDesktop.textContent = pendingOutlets.length;
            if (countElementOverlay) countElementOverlay.textContent = pendingOutlets.length;
            
            if (pendingOutlets.length === 0) {
                // Show no outlets message for all views
                if (noOutletsElement) noOutletsElement.style.display = 'block';
                if (noOutletsElementDesktop) noOutletsElementDesktop.style.display = 'block';
                if (noOutletsElementOverlay) noOutletsElementOverlay.style.display = 'block';
                if (pendingList) pendingList.style.display = 'none';
                if (pendingListDesktop) pendingListDesktop.style.display = 'none';
                if (pendingListOverlay) pendingListOverlay.style.display = 'none';
            } else {
                // Hide no outlets message for all views
                if (noOutletsElement) noOutletsElement.style.display = 'none';
                if (noOutletsElementDesktop) noOutletsElementDesktop.style.display = 'none';
                if (noOutletsElementOverlay) noOutletsElementOverlay.style.display = 'none';
                if (pendingList) pendingList.style.display = 'block';
                if (pendingListDesktop) pendingListDesktop.style.display = 'block';
                if (pendingListOverlay) pendingListOverlay.style.display = 'block';
                
                // Sort by oldest issue first (most urgent)
                pendingOutlets.sort((a, b) => a.oldestDate - b.oldestDate);
                
                pendingOutlets.forEach(item => {
                    // Different styling based on issue type
                    const hasEdits = item.editCount > 0;
                    const hasPending = item.pendingCount > 0;
                    
                    let cardClass = '';
                    if (hasEdits && hasPending) {
                        cardClass = 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer';
                    } else if (hasEdits) {
                        cardClass = 'bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-500 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer';
                    } else {
                        cardClass = 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer';
                    }
                    
                    // Create mobile version
                    const divMobile = document.createElement('div');
                    divMobile.className = cardClass;
                    divMobile.onclick = () => viewOutletDetail(item.code);
                    
                    // Create desktop version
                    const divDesktop = document.createElement('div');
                    divDesktop.className = cardClass;
                    divDesktop.onclick = () => viewOutletDetail(item.code);
                    
                    // Create overlay version (for mobile overlay tab)
                    const divOverlay = document.createElement('div');
                    divOverlay.className = cardClass;
                    divOverlay.onclick = () => {
                        closeMobilePendingOverlay();
                        viewOutletDetail(item.code);
                    };
                    
                    // Calculate days since oldest issue
                    const daysSince = Math.floor((new Date() - item.oldestDate) / (1000 * 60 * 60 * 24));
                    const urgencyColor = daysSince > 7 ? 'text-red-600' : daysSince > 3 ? 'text-orange-600' : 'text-yellow-600';
                    const urgencyIcon = daysSince > 7 ? '🚨' : daysSince > 3 ? '⚠️' : '⏰';
                    
                    // Issue type indicator
                    let issueTypeText = '';
                    let issueIcon = '';
                    if (hasEdits && hasPending) {
                        issueTypeText = `${item.pendingCount} chưa xong, ${item.editCount} cần sửa`;
                        issueIcon = '🔥';
                    } else if (hasEdits) {
                        const completedNeedsEdit = item.completedButNeedsEditCount || 0;
                        if (completedNeedsEdit > 0) {
                            issueTypeText = `${item.editCount} cần chỉnh sửa (${completedNeedsEdit} đã xong)`;
                        } else {
                            issueTypeText = `${item.editCount} cần chỉnh sửa`;
                        }
                        issueIcon = '🔧';
                    } else {
                        issueTypeText = `${item.pendingCount} chưa hoàn thành`;
                        issueIcon = '⏳';
                    }
                    
                    const cardContent = `
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                                <h4 class="font-semibold text-gray-800 text-sm">${item.outlet.name}</h4>
                                <p class="text-xs text-gray-600 font-mono">${item.code}</p>
                                <p class="text-xs text-gray-500">${item.outlet.area}</p>
                            </div>
                            <div class="text-right">
                                <span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                                    ${item.totalIssues}/${item.totalRequests}
                                </span>
                            </div>
                        </div>
                        
                        <div class="mb-2">
                            <div class="flex items-center space-x-1 text-xs">
                                <span>${issueIcon}</span>
                                <span class="text-gray-700">${issueTypeText}</span>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between text-xs">
                            <div class="flex items-center space-x-1 ${urgencyColor}">
                                <span>${urgencyIcon}</span>
                                <span>Cũ nhất: ${item.oldestDate.toLocaleString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit', 
                                    second: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                }).replace(',', '')}</span>
                            </div>
                            <button class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs btn-hover transition-all duration-300" onclick="event.stopPropagation(); viewOutletDetail('${item.code}')">
                                Xem →
                            </button>
                        </div>
                        
                        <div class="mt-2 text-xs text-gray-600">
                            <div class="truncate">
                                ${item.oldestIssue.type === 'edit' ? 
                                    `🔧 Sửa: ${item.oldestIssue.request.requesterName}` : 
                                    `👤 ${item.oldestIssue.request.requesterName}`
                                }
                            </div>
                        </div>
                    `;
                    
                    // Set content for all versions
                    divMobile.innerHTML = cardContent;
                    divDesktop.innerHTML = cardContent;
                    divOverlay.innerHTML = cardContent;
                    
                    // Append to respective containers
                    if (pendingList) pendingList.appendChild(divMobile);
                    if (pendingListDesktop) pendingListDesktop.appendChild(divDesktop);
                    if (pendingListOverlay) pendingListOverlay.appendChild(divOverlay);
                });
            }
        }

        // Helper function to parse Vietnamese date format
        function parseVietnameseDate(dateString) {
            try {
                // Handle multiple formats
                let cleanDate = dateString.replace(',', '').trim();
                
                // Check if format is already "hh:mm:ss dd/mm/yyyy"
                const timeFirstPattern = /^(\d{1,2}):(\d{2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
                const timeFirstMatch = cleanDate.match(timeFirstPattern);
                
                if (timeFirstMatch) {
                    const [, hour, minute, second, day, month, year] = timeFirstMatch;
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                }
                
                // Handle format: "15/01/2024 14:30:00" or "15/01/2024, 14:30:00"
                const parts = cleanDate.split(' ');
                
                if (parts.length >= 2) {
                    const datePart = parts[0]; // "15/01/2024"
                    const timePart = parts[1]; // "14:30:00"
                    
                    const dateComponents = datePart.split('/');
                    const timeComponents = timePart.split(':');
                    
                    if (dateComponents.length === 3 && timeComponents.length >= 2) {
                        const day = parseInt(dateComponents[0]);
                        const month = parseInt(dateComponents[1]) - 1; // Month is 0-indexed
                        const year = parseInt(dateComponents[2]);
                        const hour = parseInt(timeComponents[0]);
                        const minute = parseInt(timeComponents[1]);
                        const second = timeComponents[2] ? parseInt(timeComponents[2]) : 0;
                        
                        return new Date(year, month, day, hour, minute, second);
                    }
                }
                
                // Fallback: try to parse as is
                return new Date(dateString);
            } catch (error) {
                console.error('Error parsing date:', dateString, error);
                return new Date(); // Return current date as fallback
            }
        }

        function searchOutlet(event) {
            // Auto-filter as user types
            if (event && event.type === 'keyup') {
                filterOutlets();
                return;
            }
            
            // Manual search button click
            const searchValue = document.getElementById('searchOutletCode').value.trim();
            if (!searchValue) {
                alert('Vui lòng nhập Outlet Code hoặc Tên Outlet');
                return;
            }
            
            // First try exact code match
            if (outlets[searchValue]) {
                viewOutletDetail(searchValue);
                return;
            }
            
            // Then try to find by name or partial code
            const searchLower = searchValue.toLowerCase();
            const matches = [];
            
            for (const [code, outlet] of Object.entries(outlets)) {
                if (code.includes(searchValue) || outlet.name.toLowerCase().includes(searchLower)) {
                    matches.push({ code, outlet });
                }
            }
            
            if (matches.length === 1) {
                // Single match found
                viewOutletDetail(matches[0].code);
            } else if (matches.length > 1) {
                // Multiple matches found
                let message = `Tìm thấy ${matches.length} kết quả:\n\n`;
                matches.forEach((match, index) => {
                    message += `${index + 1}. ${match.outlet.name} (${match.code}) - ${match.outlet.area}\n`;
                });
                message += `\nVui lòng nhập chính xác hơn hoặc sử dụng bộ lọc.`;
                alert(message);
            } else {
                // No matches found
                if (/^\d{8}$/.test(searchValue)) {
                    // If search value is exactly 8 digits, offer to create new outlet
                    if (confirm(`Không tìm thấy outlet với code "${searchValue}".\n\nBạn có muốn tạo outlet mới với code "${searchValue}" không?`)) {
                        document.getElementById('newOutletCode').value = searchValue;
                        showCreateOutlet();
                    }
                } else if (/^\d+$/.test(searchValue)) {
                    alert(`Không tìm thấy outlet với code "${searchValue}".\n\n⚠️ Lưu ý: Outlet Code phải có đúng 8 chữ số.\nCode bạn nhập có ${searchValue.length} chữ số.\n\nHãy thử tìm kiếm với code 8 số hoặc tên outlet.`);
                } else {
                    alert(`Không tìm thấy outlet với từ khóa "${searchValue}".\n\nHãy thử tìm kiếm với từ khóa khác hoặc sử dụng bộ lọc bên dưới.`);
                }
            }
        }

        function viewOutletDetail(code) {
            currentOutletCode = code;
            const outlet = outlets[code];
            
            document.getElementById('outletDetailTitle').textContent = `Chi Tiết Outlet: ${outlet.name}`;
            document.getElementById('outletDetailInfo').innerHTML = `
                <div>Code: ${code} | Khu vực: ${outlet.area}</div>
                <div class="text-sm mt-1">📍 ${outlet.address || 'Chưa có địa chỉ'}</div>
            `;
            
            // Show modal
            document.getElementById('outletDetailModal').style.display = 'flex';
            
            loadRequestList(code);
            
            // Highlight selected row
            highlightSelectedOutlet(code);
        }

        function closeOutletDetail() {
            currentOutletCode = null;
            document.getElementById('outletDetailModal').style.display = 'none';
            
            // Remove highlight from all rows
            document.querySelectorAll('#outletTableBody tr').forEach(row => {
                row.classList.remove('bg-blue-100', 'border-l-4', 'border-blue-500');
            });
        }

        function highlightSelectedOutlet(code) {
            // Remove previous highlights
            document.querySelectorAll('#outletTableBody tr').forEach(row => {
                row.classList.remove('bg-blue-100', 'border-l-4', 'border-blue-500');
            });
            
            // Add highlight to selected row
            const rows = document.querySelectorAll('#outletTableBody tr');
            rows.forEach(row => {
                const codeCell = row.querySelector('td:first-child');
                if (codeCell && codeCell.textContent === code) {
                    row.classList.add('bg-blue-100', 'border-l-4', 'border-blue-500');
                }
            });
        }



        function loadRequestList(code) {
            const countElement = document.getElementById('requestCount');
            const requests = outlets[code].requests || [];
            countElement.textContent = requests.length;
            
            // Load Desktop Table
            loadRequestTable(requests);
            
            // Load Mobile Grid
            loadRequestGrid(requests);
        }

        function loadRequestTable(requests) {
            const tbody = document.getElementById('requestTableBody');
            tbody.innerHTML = '';
            
            requests.forEach((request, index) => {
                // Get item count and brands for display
                const itemCount = request.requestItems ? request.requestItems.length : 0;
                const brands = request.requestItems ? [...new Set(request.requestItems.map(item => item.brand))] : (request.brand ? [request.brand] : ['N/A']);
                const displayBrands = brands.join(', ');
                
                // Calculate edit status
                const hasEdits = request.editHistory && request.editHistory.length > 0;
                const hasUnfixedEdits = hasEdits && request.editHistory.some(edit => !edit.isFixed);
                
                const row = document.createElement('tr');
                const isCancelRequested = request.cancelRequested && !request.cancelApproved;
                const isCancelled = request.cancelRequested && request.cancelApproved;
                let rowClass = 'hover:bg-gray-50 transition-colors duration-200';
                
                if (isCancelled) {
                    rowClass += ' bg-gray-100 opacity-60';
                } else if (isCancelRequested) {
                    rowClass += ' bg-red-50 opacity-75';
                } else if (request.completed) {
                    rowClass += ' bg-green-50';
                } else {
                    rowClass += ' bg-yellow-50';
                }
                
                row.className = rowClass;
                
                row.innerHTML = `
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" class="request-checkbox" value="${request.id}">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                #${index + 1}
                            </span>
                        </div>
                    </td>
                    <td class="px-4 py-4">
                        <div class="text-sm font-semibold text-gray-900">${request.requesterName}</div>
                        <div class="text-xs text-gray-500">${request.createdAt}</div>
                        ${request.completed ? `<div class="text-xs text-green-600">✅ ${request.completedAt}</div>` : ''}
                    </td>
                    <td class="px-4 py-4">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ${itemCount} hạng mục
                        </span>
                    </td>
                    <td class="px-4 py-4">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            ${displayBrands}
                        </span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-center">
                        <div class="flex flex-col items-center space-y-1">
                            ${isCancelled ? 
                                `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                    ❌ Đã hủy
                                </span>` :
                                isCancelRequested ? 
                                `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                    🚫 Yêu cầu hủy
                                </span>` :
                                request.completed ? 
                                `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                    ✅ Hoàn thành
                                </span>` : 
                                `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                    ⏳ Chưa xong
                                </span>`
                            }
                            ${hasUnfixedEdits ? 
                                `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                    🔧 Cần sửa
                                </span>` : ''
                            }
                            ${hasEdits && !hasUnfixedEdits ? 
                                `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                    ✅ Đã sửa
                                </span>` : ''
                            }
                        </div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center space-x-2">
                            <button onclick="viewRequestDetail(${request.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Xem chi tiết">
                                Xem
                            </button>
                            <button onclick="editRequest(${request.id})" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Chỉnh sửa yêu cầu">
                                Sửa (${hasEdits ? request.editHistory.length : 0})
                            </button>
                            ${checkPermission('view') ? `
                                <button onclick="requestCancelRequest(${request.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Yêu cầu hủy">
                                    Hủy
                                </button>
                            ` : ''}
                            ${!request.completed ? 
                                (checkPermission('upload') ? 
                                    `<button onclick="uploadMaquette(${request.id})" class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Upload maquette">
                                        Upload
                                    </button>` : 
                                    '<span class="text-xs text-gray-500" title="Chờ admin upload">⏳</span>'
                                ) : 
                                `<div class="flex space-x-1">
                                    <button onclick="viewMaquette(${request.id})" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Xem maquette">
                                        Xem
                                    </button>
                                    ${checkPermission('upload') ? `
                                        <button onclick="editMaquette(${request.id})" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-xs btn-hover transition-all duration-300" title="Chỉnh sửa maquette">
                                            Sửa
                                        </button>
                                    ` : ''}
                                </div>`
                            }
                        </div>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
        }

        function loadRequestGrid(requests) {
            const container = document.getElementById('requestGridContainer');
            container.innerHTML = '';
            
            requests.forEach((request, index) => {
                // Get item count and brands for display
                const itemCount = request.requestItems ? request.requestItems.length : 0;
                const brands = request.requestItems ? [...new Set(request.requestItems.map(item => item.brand))] : (request.brand ? [request.brand] : ['N/A']);
                const displayBrands = brands.join(', ');
                
                // Calculate edit status
                const hasEdits = request.editHistory && request.editHistory.length > 0;
                const hasUnfixedEdits = hasEdits && request.editHistory.some(edit => !edit.isFixed);
                
                const card = document.createElement('div');
                const isCancelRequested = request.cancelRequested && !request.cancelApproved;
                const isCancelled = request.cancelRequested && request.cancelApproved;
                
                let cardClass = 'bg-gradient-to-br from-white border rounded-lg p-4 hover:shadow-lg transition-all duration-300';
                
                if (isCancelled) {
                    cardClass += ' to-gray-50 border-gray-200 opacity-60';
                } else if (isCancelRequested) {
                    cardClass += ' to-red-50 border-red-200 opacity-75';
                } else if (request.completed) {
                    cardClass += ' to-green-50 border-green-200';
                } else {
                    cardClass += ' to-yellow-50 border-yellow-200';
                }
                
                card.className = cardClass;
                
                card.innerHTML = `
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" class="request-checkbox" value="${request.id}">
                            <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                                #${index + 1}
                            </span>
                        </div>
                        <div class="flex flex-col items-end space-y-1">
                            ${isCancelled ? 
                                `<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                                    ❌ Đã hủy
                                </span>` :
                                isCancelRequested ? 
                                `<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                                    🚫 Yêu cầu hủy
                                </span>` :
                                request.completed ? 
                                `<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                                    ✅ Hoàn thành
                                </span>` : 
                                `<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">
                                    ⏳ Chưa xong
                                </span>`
                            }
                            ${hasUnfixedEdits ? 
                                `<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                                    🔧 Cần sửa
                                </span>` : ''
                            }
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <h4 class="font-bold text-gray-800 text-sm mb-2">👤 ${request.requesterName}</h4>
                        <div class="space-y-1">
                            <div class="flex items-center space-x-2">
                                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                    ${itemCount} hạng mục
                                </span>
                                <span class="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                                    ${displayBrands}
                                </span>
                            </div>
                            <p class="text-xs text-gray-600">📅 ${request.createdAt}</p>
                            ${request.completed ? 
                                `<p class="text-xs text-green-600">✅ ${request.completedAt}</p>` : ''
                            }
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-200 pt-3">
                        <div class="flex items-center justify-between mb-2">
                            <button onclick="editRequest(${request.id})" class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs btn-hover transition-all duration-300 touch-btn" title="Chỉnh sửa yêu cầu">
                                Sửa (${hasEdits ? request.editHistory.length : 0})
                            </button>
                            ${hasEdits ? 
                                `<span class="text-xs ${hasUnfixedEdits ? 'text-red-600' : 'text-green-600'}">
                                    ${hasUnfixedEdits ? '🔧 Cần sửa' : '✅ Đã sửa'}
                                </span>` : 
                                '<span class="text-xs text-gray-500">Chưa có sửa</span>'
                            }
                        </div>
                        
                        <div class="flex flex-wrap gap-2">
                            <button onclick="viewRequestDetail(${request.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs btn-hover transition-all duration-300 touch-btn">
                                Chi Tiết
                            </button>
                            ${checkPermission('view') ? `
                                <button onclick="requestCancelRequest(${request.id})" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs btn-hover transition-all duration-300 touch-btn" title="Yêu cầu hủy">
                                    Hủy
                                </button>
                            ` : ''}
                            ${!request.completed ? 
                                (checkPermission('upload') ? 
                                    `<button onclick="uploadMaquette(${request.id})" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs btn-hover transition-all duration-300 touch-btn">
                                        Upload
                                    </button>` : 
                                    '<span class="text-xs text-gray-500">Chờ admin upload</span>'
                                ) : 
                                `<div class="flex gap-1">
                                    <button onclick="viewMaquette(${request.id})" class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs btn-hover transition-all duration-300 touch-btn">
                                        Xem
                                    </button>
                                    ${checkPermission('upload') ? `
                                        <button onclick="editMaquette(${request.id})" class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs btn-hover transition-all duration-300 touch-btn" title="Chỉnh sửa maquette">
                                            Sửa
                                        </button>
                                    ` : ''}
                                </div>`
                            }
                        </div>
                    </div>
                `;
                
                container.appendChild(card);
            });
        }

        function toggleSelectAll() {
            const selectAll = document.getElementById('selectAll');
            const checkboxes = document.querySelectorAll('.request-checkbox');
            checkboxes.forEach(cb => cb.checked = selectAll.checked);
        }

        function showCreateOutlet() {
            if (!checkPermission('create') && !checkPermission('manage')) {
                alert('❌ Bạn không có quyền tạo outlet mới!');
                return;
            }
            document.getElementById('createOutletModal').style.display = 'flex';
        }

        function validateOutletCodeInput(input) {
            // Remove any non-numeric characters
            const numericValue = input.value.replace(/[^0-9]/g, '');
            
            // Limit to 8 digits maximum
            const limitedValue = numericValue.slice(0, 8);
            
            // Update input value if it was changed
            if (input.value !== limitedValue) {
                input.value = limitedValue;
                
                // Show warning message temporarily
                const resultDiv = document.getElementById('codeCheckResult');
                resultDiv.innerHTML = `
                    <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-orange-500">⚠️</span>
                            <div class="text-orange-700 font-semibold">Đã xóa ký tự không hợp lệ! Chỉ được nhập số và tối đa 8 chữ số.</div>
                        </div>
                    </div>
                `;
                resultDiv.style.display = 'block';
                
                // Hide warning after 3 seconds
                setTimeout(() => {
                    if (resultDiv.innerHTML.includes('Đã xóa ký tự không hợp lệ')) {
                        resultDiv.style.display = 'none';
                    }
                }, 3000);
            }
            
            // Show real-time validation status
            const resultDiv = document.getElementById('codeCheckResult');
            if (limitedValue.length > 0 && limitedValue.length < 8) {
                resultDiv.innerHTML = `
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-yellow-500">⏳</span>
                            <div class="text-yellow-700 font-semibold">Đã nhập ${limitedValue.length}/8 chữ số. Cần thêm ${8 - limitedValue.length} chữ số nữa.</div>
                        </div>
                    </div>
                `;
                resultDiv.style.display = 'block';
            } else if (limitedValue.length === 8) {
                // Check if code exists when exactly 8 digits
                checkOutletCodeExists(limitedValue);
            } else if (limitedValue.length === 0) {
                resultDiv.style.display = 'none';
            }
        }

        function checkOutletCodeExists(code) {
            const resultDiv = document.getElementById('codeCheckResult');
            
            if (!code || code.trim() === '') {
                resultDiv.style.display = 'none';
                return;
            }
            
            code = code.trim();
            
            // Check if code contains only numbers
            if (!/^\d+$/.test(code)) {
                resultDiv.innerHTML = `
                    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-red-500">❌</span>
                            <div>
                                <div class="text-red-700 font-semibold">Code không hợp lệ!</div>
                                <div class="text-red-600 text-xs mt-1">
                                    Outlet Code chỉ được chứa số (0-9) và phải đúng 8 chữ số
                                </div>
                                <div class="text-red-600 text-xs">
                                    Ví dụ hợp lệ: 10000001, 20000001, 12345678
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                resultDiv.style.display = 'block';
                return false;
            }
            
            // Check if code has exactly 8 digits
            if (code.length !== 8) {
                resultDiv.innerHTML = `
                    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-red-500">❌</span>
                            <div>
                                <div class="text-red-700 font-semibold">Code phải có đúng 8 chữ số!</div>
                                <div class="text-red-600 text-xs mt-1">
                                    Bạn đã nhập ${code.length} chữ số, cần ${code.length < 8 ? 'thêm ' + (8 - code.length) : 'bớt ' + (code.length - 8)} chữ số
                                </div>
                                <div class="text-red-600 text-xs">
                                    Ví dụ hợp lệ: 10000001, 20000001, 12345678
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                resultDiv.style.display = 'block';
                return false;
            }
            
            if (outlets[code]) {
                resultDiv.innerHTML = `
                    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-red-500">❌</span>
                            <div>
                                <div class="text-red-700 font-semibold">Code đã tồn tại trong hệ thống!</div>
                                <div class="text-red-600 text-xs mt-1">
                                    Outlet: "${outlets[code].name}" - ${outlets[code].area}
                                </div>
                                <div class="text-red-600 text-xs">
                                    Vui lòng nhập code khác hoặc tìm kiếm outlet này ở trang chính
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                resultDiv.style.display = 'block';
                return false;
            } else {
                resultDiv.innerHTML = `
                    <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-green-500">✅</span>
                            <div class="text-green-700 font-semibold">Code hợp lệ và khả dụng! Có thể tạo outlet mới.</div>
                        </div>
                    </div>
                `;
                resultDiv.style.display = 'block';
                return true;
            }
        }

        function hideCreateOutlet() {
            document.getElementById('createOutletModal').style.display = 'none';
            document.getElementById('createOutletForm').reset();
            document.getElementById('codeCheckResult').style.display = 'none';
        }

        function showNewRequestForm() {
            if (!checkPermission('create')) {
                if (currentUser && currentUser.position === 'SS') {
                    alert('❌ Chức vụ SS không có quyền tạo yêu cầu mới!\n\nChỉ có SR/TBA mới được tạo yêu cầu. Bạn có thể xem và comment chỉnh sửa các yêu cầu hiện có.');
                } else {
                    alert('❌ Bạn không có quyền tạo yêu cầu mới!');
                }
                return;
            }
            if (!currentOutletCode) {
                alert('Vui lòng chọn outlet trước');
                return;
            }
            
            // Tự động điền tên người yêu cầu
            if (currentUser && currentUser.name) {
                document.getElementById('requesterName').value = currentUser.name;
            }
            
            // Tự động điền địa chỉ từ outlet
            const outlet = outlets[currentOutletCode];
            if (outlet && outlet.address) {
                document.getElementById('requestAddress').value = outlet.address;
            }
            
            document.getElementById('newRequestModal').style.display = 'flex';
            
            // Tự động thêm hạng mục đầu tiên nếu chưa có
            const container = document.getElementById('requestItemsContainer');
            if (container.children.length === 0) {
                addRequestItem();
            }
        }

        function hideNewRequestForm() {
            document.getElementById('newRequestModal').style.display = 'none';
            document.getElementById('newRequestForm').reset();
            document.getElementById('requestItemsContainer').innerHTML = '';
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('imagePreview').innerHTML = '';
        }

        function addRequestItem() {
            const container = document.getElementById('requestItemsContainer');
            const itemDiv = document.createElement('div');
            itemDiv.className = 'border border-gray-200 rounded p-3 mb-2 request-item';
            itemDiv.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-700 text-sm">Hạng Mục</h4>
                    <button type="button" onclick="removeRequestItem(this)" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">
                        Xóa
                    </button>
                </div>
                <div class="space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-xs text-orange-700 mb-1 font-semibold">Loại *</label>
                            <select class="w-full px-2 py-1 border-2 border-orange-300 rounded focus:border-orange-500 focus:outline-none item-type text-sm bg-white" onchange="toggleItemFields(this)" required>
                                <option value="Bảng Hiệu">Bảng Hiệu</option>
                                <option value="Hộp Đèn">Hộp Đèn</option>
                                <option value="Logo">Logo</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-orange-700 mb-1 font-semibold">Brand *</label>
                            <select class="w-full px-2 py-1 border-2 border-orange-300 rounded focus:border-orange-500 focus:outline-none item-brand text-sm bg-white" required>
                                <option value="Tiger">Tiger</option>
                                <option value="Heineken">Heineken</option>
                                <option value="Strongbow">Strongbow</option>
                                <option value="Bivina">Bivina</option>
                                <option value="Bia Việt">Bia Việt</option>
                                <option value="Shopname">Shopname</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Custom Type Section -->
                    <div class="item-custom-section" style="display: none;">
                        <textarea class="w-full px-2 py-1 border-2 border-orange-300 rounded focus:border-orange-500 focus:outline-none resize-none item-custom-desc text-sm bg-white" rows="2" placeholder="Mô tả yêu cầu khác"></textarea>
                    </div>
                    
                    <!-- Size Section -->
                    <div class="item-size-section">
                        <div class="grid grid-cols-2 gap-2">
                            <input type="number" class="w-full px-2 py-1 border-2 border-orange-300 rounded focus:border-orange-500 focus:outline-none item-width text-sm bg-white" min="0" step="0.1" placeholder="Ngang (m)">
                            <input type="number" class="w-full px-2 py-1 border-2 border-orange-300 rounded focus:border-orange-500 focus:outline-none item-height text-sm bg-white" min="0" step="0.1" placeholder="Cao (m)">
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(itemDiv);
            updateItemNumbers();
        }



        function removeRequestItem(button) {
            button.closest('.request-item').remove();
            updateItemNumbers();
        }

        function updateItemNumbers() {
            const items = document.querySelectorAll('.request-item');
            items.forEach((item, index) => {
                const title = item.querySelector('h4');
                title.textContent = `Hạng Mục ${index + 1}`;
            });
        }

        function toggleItemFields(selectElement) {
            const itemDiv = selectElement.closest('.request-item');
            const type = selectElement.value;
            const customSection = itemDiv.querySelector('.item-custom-section');
            const sizeSection = itemDiv.querySelector('.item-size-section');
            const notesSection = itemDiv.querySelector('.item-notes-section');
            
            customSection.style.display = type === 'Khác' ? 'block' : 'none';
            sizeSection.style.display = ['Logo', 'Bảng Hiệu', 'Hộp Đèn'].includes(type) ? 'block' : 'none';
            notesSection.style.display = type === 'Logo' ? 'block' : 'none';
        }

        // Upload Maquette Form submission
        document.getElementById('uploadMaquetteForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const notes = document.getElementById('completionNotes').value.trim();
            const fileInput = document.getElementById('maquetteFiles');
            
            // Sync files from input to selectedMaquetteFiles if needed
            if (fileInput.files.length > 0) {
                const inputFiles = Array.from(fileInput.files);
                inputFiles.forEach(file => {
                    const exists = selectedMaquetteFiles.some(f => f.name === file.name && f.size === file.size);
                    if (!exists) {
                        selectedMaquetteFiles.push(file);
                    }
                });
            }
            
            // Final check for files
            if (selectedMaquetteFiles.length === 0) {
                alert('Vui lòng chọn ít nhất 1 file maquette!');
                return;
            }
            
            // Get file names and data
            const filePromises = selectedMaquetteFiles.map(file => {
                return new Promise((resolve) => {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            resolve({
                                name: file.name,
                                type: file.type,
                                data: e.target.result
                            });
                        };
                        reader.readAsDataURL(file);
                    } else {
                        resolve({
                            name: file.name,
                            type: file.type,
                            data: null // For non-image files, we just store the name
                        });
                    }
                });
            });
            
            Promise.all(filePromises).then(fileData => {
                // Update request
                const requestIndex = outlets[currentOutletCode].requests.findIndex(r => r.id === currentRequestId);
                if (requestIndex !== -1) {
                    outlets[currentOutletCode].requests[requestIndex].completed = true;
                    outlets[currentOutletCode].requests[requestIndex].completedAt = new Date().toLocaleString('vi-VN');
                    outlets[currentOutletCode].requests[requestIndex].maquetteFiles = fileData.map(f => f.name);
                    outlets[currentOutletCode].requests[requestIndex].maquetteData = fileData;
                    outlets[currentOutletCode].requests[requestIndex].completionNotes = notes;
                    
                    saveData();
                    loadRequestList(currentOutletCode);
                    loadOutletList();
                    hideUploadMaquette();
                    
                    alert('✅ Đã xác nhận hoàn thành yêu cầu!');
                }
            });
        });

        // Form submissions
        document.getElementById('createOutletForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const code = document.getElementById('newOutletCode').value.trim();
            const name = document.getElementById('newOutletName').value.trim();
            const address = document.getElementById('newOutletAddress').value.trim();
            const area = document.getElementById('newOutletArea').value;
            
            if (!code) {
                alert('❌ Vui lòng nhập Outlet Code!');
                return;
            }
            
            if (!address) {
                alert('❌ Vui lòng nhập địa chỉ outlet!');
                return;
            }
            
            // Validate code format (must be exactly 8 digits)
            if (!/^\d{8}$/.test(code)) {
                alert('❌ Outlet Code không hợp lệ!\n\nCode phải có đúng 8 chữ số (VD: 10000001, 20000001, 12345678)');
                checkOutletCodeExists(code); // Show the error message
                return;
            }
            
            // Check if code already exists
            if (outlets[code]) {
                alert(`❌ Outlet Code "${code}" đã tồn tại!\n\nOutlet: "${outlets[code].name}" - ${outlets[code].area}\n\nVui lòng nhập code khác hoặc tìm kiếm outlet này ở trang chính.`);
                checkOutletCodeExists(code); // Show the error message
                return;
            }
            
            outlets[code] = {
                name: name,
                address: address,
                area: area,
                requests: []
            };
            
            saveData();
            loadOutletList();
            hideCreateOutlet();
            
            alert(`✅ Tạo outlet thành công!\n\nOutlet Code: ${code}\nTên: ${name}\nĐịa chỉ: ${address}\nKhu vực: ${area}`);
        });

        document.getElementById('newRequestForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const requesterName = document.getElementById('requesterName').value.trim();
            const address = document.getElementById('requestAddress').value.trim();
            const content = document.getElementById('requestContent').value.trim();
            const imageFiles = document.getElementById('requestImage').files;
            
            // Validate required fields
            if (!requesterName) {
                alert('❌ Vui lòng nhập tên người yêu cầu!');
                document.getElementById('requesterName').focus();
                return;
            }
            
            if (!address) {
                alert('❌ Vui lòng nhập địa chỉ!');
                document.getElementById('requestAddress').focus();
                return;
            }
            
            if (imageFiles.length === 0) {
                alert('❌ Vui lòng chọn ít nhất 1 hình ảnh!\n\n📷 Hướng dẫn:\n• Up được nhiều hình\n• Chụp cận nội dung cũ (nếu có)\n• Chụp toàn cảnh vị trí');
                document.getElementById('requestImage').focus();
                return;
            }
            
            // Get and validate request items
            const requestItems = [];
            const itemDivs = document.querySelectorAll('.request-item');
            
            if (itemDivs.length === 0) {
                alert('❌ Vui lòng thêm ít nhất 1 hạng mục khảo sát!');
                return;
            }
            
            let hasIncompleteItem = false;
            let incompleteItemIndex = -1;
            
            itemDivs.forEach((itemDiv, index) => {
                const type = itemDiv.querySelector('.item-type').value;
                const brand = itemDiv.querySelector('.item-brand').value.trim();
                const width = itemDiv.querySelector('.item-width').value;
                const height = itemDiv.querySelector('.item-height').value;
                const customDesc = itemDiv.querySelector('.item-custom-desc') ? itemDiv.querySelector('.item-custom-desc').value.trim() : '';
                const notes = itemDiv.querySelector('.item-notes') ? itemDiv.querySelector('.item-notes').value.trim() : '';
                
                // Validate required fields for each item
                if (!type || !brand) {
                    hasIncompleteItem = true;
                    incompleteItemIndex = index + 1;
                    return;
                }
                
                // If type is "Khác", custom description is required
                if (type === 'Khác' && !customDesc) {
                    hasIncompleteItem = true;
                    incompleteItemIndex = index + 1;
                    return;
                }
                
                requestItems.push({
                    type: type === 'Khác' ? customDesc : type,
                    brand,
                    width: width ? parseFloat(width) : null,
                    height: height ? parseFloat(height) : null,
                    notes: notes || null
                });
            });
            
            if (hasIncompleteItem) {
                alert(`❌ Hạng mục ${incompleteItemIndex} chưa điền đầy đủ thông tin!\n\n✅ Yêu cầu:\n• Loại hạng mục: Bắt buộc\n• Brand: Bắt buộc\n• Mô tả (nếu chọn "Khác"): Bắt buộc\n\nVui lòng điền đầy đủ thông tin hoặc xóa hạng mục này.`);
                return;
            }
            
            if (requestItems.length === 0) {
                alert('❌ Vui lòng thêm ít nhất 1 hạng mục khảo sát hợp lệ!');
                return;
            }
            
            // Process uploaded images
            const imagePromises = [];
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const promise = new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        resolve({
                            name: file.name,
                            data: e.target.result
                        });
                    };
                    reader.readAsDataURL(file);
                });
                imagePromises.push(promise);
            }
            
            Promise.all(imagePromises).then(images => {
                const newRequest = {
                    id: Date.now(),
                    requesterName,
                    address,
                    content,
                    requestItems,
                    images: images,
                    createdAt: new Date().toLocaleString('vi-VN')
                };
                
                if (!outlets[currentOutletCode].requests) {
                    outlets[currentOutletCode].requests = [];
                }
                
                outlets[currentOutletCode].requests.push(newRequest);
                saveData();
                loadRequestList(currentOutletCode);
                loadOutletList();
                hideNewRequestForm();
                
                alert('Tạo yêu cầu thành công!');
            });
        });

        function uploadMaquette(requestId) {
            if (!checkPermission('upload')) {
                alert('❌ Bạn không có quyền upload maquette!');
                return;
            }
            currentRequestId = requestId;
            const request = outlets[currentOutletCode].requests.find(r => r.id === requestId);
            if (!request) return;
            
            // Populate request info
            let requestInfo = `
                <div><strong>👤 Người yêu cầu:</strong> ${request.requesterName}</div>
                <div><strong>🕒 Ngày tạo:</strong> ${request.createdAt}</div>
            `;
            
            if (request.requestItems && request.requestItems.length > 0) {
                requestInfo += `<div><strong>📦 Hạng mục:</strong> ${request.requestItems.length} hạng mục</div>`;
                request.requestItems.forEach((item, index) => {
                    requestInfo += `<div class="ml-4 text-sm">• ${item.type} - ${item.shopName}</div>`;
                });
            }
            
            document.getElementById('requestInfo').innerHTML = requestInfo;
            
            document.getElementById('uploadMaquetteModal').style.display = 'flex';
        }

        function hideUploadMaquette() {
            document.getElementById('uploadMaquetteModal').style.display = 'none';
            document.getElementById('uploadMaquetteForm').reset();
            document.getElementById('maquettePreview').style.display = 'none';
            document.getElementById('maquettePreview').innerHTML = '';
            selectedMaquetteFiles = []; // Clear selected files
            currentRequestId = null;
        }

        function viewMaquette(requestId) {
            const request = outlets[currentOutletCode].requests.find(r => r.id === requestId);
            if (!request || !request.maquetteFiles) return;
            
            let content = `
                <div class="space-y-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-2">📋 Thông Tin Yêu Cầu</h4>
                        <div class="text-sm text-gray-700 space-y-1">
                            <div><strong>👤 Người yêu cầu:</strong> ${request.requesterName}</div>
                            <div><strong>🕒 Ngày hoàn thành:</strong> ${request.completedAt}</div>
            `;
            
            if (request.requestItems && request.requestItems.length > 0) {
                content += `<div><strong>📦 Hạng mục:</strong> ${request.requestItems.length} hạng mục</div>`;
                request.requestItems.forEach((item, index) => {
                    content += `<div class="ml-4">• ${item.type} - ${item.shopName}</div>`;
                });
            }
            
            content += `
                        </div>
                    </div>
            `;
            
            if (request.completionNotes) {
                content += `
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-2">📝 Ghi Chú Hoàn Thành</h4>
                        <p class="text-sm text-gray-700">${request.completionNotes}</p>
                    </div>
                `;
            }
            
            content += `
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-2">🖼️ Maquette Files (${request.maquetteFiles.length} file)</h4>
            `;
            
            // Display maquette files with preview
            if (request.maquetteData && request.maquetteData.length > 0) {
                content += `<div class="grid grid-cols-2 gap-4 mt-3">`;
                
                request.maquetteData.forEach((fileData, index) => {
                    if (fileData.type && fileData.type.startsWith('image/') && fileData.data) {
                        content += `
                            <div class="text-center">
                                <img src="${fileData.data}" alt="${fileData.name}" class="w-full h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors" onclick="showFullImage('${fileData.data}', '${fileData.name}')">
                                <p class="text-xs text-gray-600 mt-1">${fileData.name}</p>
                                <p class="text-xs text-green-600">📷 Hình ảnh</p>
                            </div>
                        `;
                    } else {
                        const fileIcon = fileData.type === 'application/pdf' ? '📄' : '📎';
                        const fileColor = fileData.type === 'application/pdf' ? 'text-red-600' : 'text-gray-600';
                        const fileType = fileData.type === 'application/pdf' ? 'PDF File' : 'File';
                        
                        content += `
                            <div class="text-center">
                                <div class="w-full h-32 bg-gray-100 rounded-lg border-2 border-gray-200 flex flex-col items-center justify-center">
                                    <span class="text-4xl mb-2">${fileIcon}</span>
                                    <p class="text-xs text-gray-600 px-2 truncate">${fileData.name}</p>
                                    <p class="text-xs ${fileColor}">${fileType}</p>
                                </div>
                            </div>
                        `;
                    }
                });
                
                content += `</div>`;
            } else {
                // Fallback for old data format
                content += `
                    <div class="text-sm text-gray-700">
                        <p><strong>Số lượng file:</strong> ${request.maquetteFiles.length} file(s)</p>
                        <div class="mt-2 space-y-1">
                `;
                
                request.maquetteFiles.forEach((file, index) => {
                    content += `<div>📎 File ${index + 1}: ${file}</div>`;
                });
                
                content += `
                        </div>
                    </div>
                `;
            }
            
            content += `
                    </div>
                </div>
            `;
            
            document.getElementById('maquetteContent').innerHTML = content;
            document.getElementById('viewMaquetteModal').style.display = 'flex';
        }

        function hideViewMaquette() {
            document.getElementById('viewMaquetteModal').style.display = 'none';
        }

        function viewRequestDetail(requestId) {
            const request = outlets[currentOutletCode].requests.find(r => r.id === requestId);
            if (!request) return;
            
            // Find request index for display
            const requestIndex = outlets[currentOutletCode].requests.findIndex(r => r.id === requestId);
            const requestNumber = requestIndex + 1;
            
            // Update modal title
            const modalTitle = document.querySelector('#viewMaquetteModal h3');
            modalTitle.textContent = `Xem Chi Tiết Yêu Cầu Số ${requestNumber}`;
            
            // Create modal content instead of alert
            let content = `
                <div class="space-y-4">
                    <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <h4 class="font-semibold text-orange-800 mb-2">Thông Tin Cơ Bản</h4>
                        <div class="text-sm text-gray-700 space-y-1">
                            <div><strong>Người yêu cầu:</strong> ${request.requesterName}</div>
                            <div><strong>Địa chỉ:</strong> ${request.address}</div>
                            <div><strong>Ngày tạo:</strong> ${request.createdAt}</div>
                        </div>
                    </div>
            `;
            
            if (request.content) {
                content += `
                    <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <h4 class="font-semibold text-orange-800 mb-2">Nội Dung Bảng Hiệu</h4>
                        <p class="text-sm text-gray-700">${request.content}</p>
                    </div>
                `;
            }
            
            if (request.requestItems && request.requestItems.length > 0) {
                content += `
                    <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <h4 class="font-semibold text-orange-800 mb-2">Hạng Mục Khảo Sát (${request.requestItems.length} hạng mục)</h4>
                        <div class="text-sm text-gray-700 space-y-2">
                `;
                request.requestItems.forEach((item, index) => {
                    content += `
                        <div class="border-l-4 border-purple-300 pl-3">
                            <div><strong>Hạng mục ${index + 1}:</strong> ${item.type}</div>
                            <div><strong>🏷️ Brand:</strong> ${item.brand}</div>
                    `;
                    if (item.width && item.height) {
                        content += `<div><strong>Kích thước:</strong> ${item.width} x ${item.height} m</div>`;
                    }
                    if (item.notes) {
                        content += `<div><strong>Ghi chú:</strong> ${item.notes}</div>`;
                    }
                    content += `</div>`;
                });
                content += `
                        </div>
                    </div>
                `;
            }
            
            // Display uploaded images
            if (request.images && request.images.length > 0) {
                content += `
                    <div class="bg-orange-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-2">📷 Hình Ảnh Thực Tế (${request.images.length} ảnh)</h4>
                        <div class="grid grid-cols-2 gap-4 mt-3">
                `;
                request.images.forEach((image, index) => {
                    content += `
                        <div class="text-center">
                            <img src="${image.data}" alt="${image.name}" class="w-full h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors" onclick="showFullImage('${image.data}', '${image.name}')">
                            <p class="text-xs text-gray-600 mt-1">${image.name}</p>
                        </div>
                    `;
                });
                content += `
                        </div>
                    </div>
                `;
            }
            
            // Display edit history if exists
            if (request.editHistory && request.editHistory.length > 0) {
                const hasUnfixedEdits = request.editHistory.some(edit => !edit.isFixed);
                
                content += `
                    <div class="bg-orange-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-2">✏️ Lịch Sử Chỉnh Sửa (${request.editHistory.length} lần)</h4>
                        <div class="space-y-2 max-h-40 overflow-y-auto">
                `;
                
                // Sort by newest first
                const sortedHistory = [...request.editHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                sortedHistory.forEach((edit, index) => {
                    content += `
                        <div class="border-l-4 ${edit.isFixed ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'} p-2 rounded-r-lg">
                            <div class="text-xs text-gray-600 mb-1">
                                📅 ${edit.timestamp}
                                ${edit.isFixed ? '<span class="ml-2 text-green-600 font-semibold">✅ Đã sửa xong</span>' : '<span class="ml-2 text-red-600 font-semibold">🔧 Cần sửa</span>'}
                            </div>
                            <div class="text-sm text-gray-800">${edit.content}</div>
                        </div>
                    `;
                });
                
                content += `
                        </div>
                        <div class="mt-2 text-xs ${hasUnfixedEdits ? 'text-red-600' : 'text-green-600'}">
                            ${hasUnfixedEdits ? '🔧 Có yêu cầu chỉnh sửa chưa hoàn thành' : '✅ Tất cả chỉnh sửa đã hoàn thành'}
                        </div>
                    </div>
                `;
            }

            if (request.completed) {
                content += `
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-2">✅ Trạng Thái Hoàn Thành</h4>
                        <div class="text-sm text-gray-700 space-y-1">
                            <div><strong>🕒 Ngày hoàn thành:</strong> ${request.completedAt}</div>
                `;
                if (request.completionNotes) {
                    content += `<div><strong>📝 Ghi chú hoàn thành:</strong> ${request.completionNotes}</div>`;
                }
                if (request.maquetteFiles && request.maquetteFiles.length > 0) {
                    content += `<div><strong>📎 Files đã upload:</strong> ${request.maquetteFiles.length} file(s)</div>`;
                }
                content += `
                        </div>
                    </div>
                `;
            } else {
                content += `
                    <div class="bg-yellow-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-2">⏳ Trạng Thái</h4>
                        <p class="text-sm text-gray-700">Yêu cầu chưa được hoàn thành</p>
                    </div>
                `;
            }
            
            content += `</div>`;
            
            // Show in modal
            document.getElementById('maquetteContent').innerHTML = content;
            document.getElementById('viewMaquetteModal').style.display = 'flex';
        }

        function showFullImage(imageSrc, imageName) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="max-w-4xl max-h-full bg-white rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold">${imageName}</h3>
                        <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">
                            ✕ Đóng
                        </button>
                    </div>
                    <img src="${imageSrc}" alt="${imageName}" class="max-w-full max-h-96 object-contain mx-auto">
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Image preview functionality
        document.getElementById('requestImage').addEventListener('change', function(e) {
            const files = e.target.files;
            const preview = document.getElementById('imagePreview');
            
            if (files.length > 0) {
                preview.innerHTML = '';
                preview.style.display = 'grid';
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        const div = document.createElement('div');
                        div.className = 'relative';
                        div.innerHTML = `
                            <img src="${e.target.result}" alt="${file.name}" class="w-full h-20 object-cover rounded border">
                            <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b truncate">
                                ${file.name}
                            </div>
                        `;
                        preview.appendChild(div);
                    };
                    
                    reader.readAsDataURL(file);
                }
            } else {
                preview.style.display = 'none';
            }
        });

        // Maquette files management
        let selectedMaquetteFiles = [];

        // Maquette preview functionality
        document.getElementById('maquetteFiles').addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            
            // Add new files to selected files array
            files.forEach(file => {
                // Check if file already exists
                const exists = selectedMaquetteFiles.some(f => f.name === file.name && f.size === file.size);
                if (!exists) {
                    selectedMaquetteFiles.push(file);
                }
            });
            
            updateMaquettePreview();
            
            // Debug log
            console.log('Files selected:', selectedMaquetteFiles.length);
            
            // Don't clear the input - keep files there for form validation
            // e.target.value = '';
        });

        function updateMaquettePreview() {
            const preview = document.getElementById('maquettePreview');
            
            if (selectedMaquetteFiles.length > 0) {
                preview.innerHTML = '';
                preview.style.display = 'grid';
                
                selectedMaquetteFiles.forEach((file, index) => {
                    const div = document.createElement('div');
                    div.className = 'relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center group hover:border-blue-400 transition-colors';
                    
                    // Delete button
                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button';
                    deleteBtn.className = 'absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10';
                    deleteBtn.innerHTML = '✕';
                    deleteBtn.onclick = () => removeMaquetteFile(index);
                    
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            div.innerHTML = `
                                <img src="${e.target.result}" alt="${file.name}" class="w-full h-24 object-cover rounded mb-2 cursor-pointer hover:opacity-75 transition-opacity" onclick="showFullMaquetteImage('${e.target.result}', '${file.name}')">
                                <p class="text-xs text-gray-600 truncate">${file.name}</p>
                                <p class="text-xs text-green-600">📷 Hình ảnh</p>
                            `;
                            div.appendChild(deleteBtn);
                        };
                        reader.readAsDataURL(file);
                    } else if (file.type === 'application/pdf') {
                        div.innerHTML = `
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-2 cursor-pointer hover:bg-red-200 transition-colors" onclick="alert('PDF Preview: ${file.name}\\nKích thước: ${(file.size/1024/1024).toFixed(2)} MB')">
                                    <span class="text-2xl">📄</span>
                                </div>
                                <p class="text-xs text-gray-600 truncate">${file.name}</p>
                                <p class="text-xs text-red-600">PDF File</p>
                                <p class="text-xs text-gray-500">${(file.size/1024/1024).toFixed(2)} MB</p>
                            </div>
                        `;
                        div.appendChild(deleteBtn);
                    } else {
                        div.innerHTML = `
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                                    <span class="text-2xl">📎</span>
                                </div>
                                <p class="text-xs text-gray-600 truncate">${file.name}</p>
                                <p class="text-xs text-gray-600">File</p>
                                <p class="text-xs text-gray-500">${(file.size/1024/1024).toFixed(2)} MB</p>
                            </div>
                        `;
                        div.appendChild(deleteBtn);
                    }
                    
                    preview.appendChild(div);
                });
            } else {
                preview.style.display = 'none';
            }
        }

        function removeMaquetteFile(index) {
            selectedMaquetteFiles.splice(index, 1);
            updateMaquettePreview();
        }

        function showFullMaquetteImage(imageSrc, imageName) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="max-w-4xl max-h-full bg-white rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold">🖼️ ${imageName}</h3>
                        <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">
                            ✕ Đóng
                        </button>
                    </div>
                    <img src="${imageSrc}" alt="${imageName}" class="max-w-full max-h-96 object-contain mx-auto rounded-lg shadow-lg">
                </div>
            `;
            document.body.appendChild(modal);
        }

        function editMaquette(requestId) {
            if (!checkPermission('upload')) {
                alert('❌ Bạn không có quyền chỉnh sửa maquette!');
                return;
            }
            if (!currentOutletCode) {
                alert('❌ Lỗi: Không tìm thấy outlet hiện tại');
                return;
            }
            
            const request = outlets[currentOutletCode].requests.find(r => r.id === requestId);
            if (!request) {
                alert('❌ Lỗi: Không tìm thấy yêu cầu');
                return;
            }
            
            if (!request.completed) {
                alert('⚠️ Yêu cầu này chưa được hoàn thành');
                return;
            }
            
            currentRequestId = requestId;
            
            // Populate request info
            let requestInfo = `
                <div><strong>👤 Người yêu cầu:</strong> ${request.requesterName}</div>
                <div><strong>🕒 Hoàn thành lúc:</strong> ${request.completedAt}</div>
            `;
            
            if (request.requestItems && request.requestItems.length > 0) {
                requestInfo += `<div><strong>📦 Hạng mục:</strong> ${request.requestItems.length} hạng mục</div>`;
            }
            
            document.getElementById('editRequestInfo').innerHTML = requestInfo;
            
            // Show current files
            let currentFilesHtml = '';
            if (request.maquetteFiles && request.maquetteFiles.length > 0) {
                currentFilesHtml = `<div class="text-sm"><strong>📎 Files hiện tại (${request.maquetteFiles.length}):</strong></div>`;
                request.maquetteFiles.forEach((file, index) => {
                    currentFilesHtml += `<div class="text-xs text-gray-600 ml-2">• ${file}</div>`;
                });
            } else {
                currentFilesHtml = '<div class="text-sm text-gray-500">Không có files</div>';
            }
            document.getElementById('currentMaquetteFiles').innerHTML = currentFilesHtml;
            
            // Set current notes
            document.getElementById('editCompletionNotes').value = request.completionNotes || '';
            
            // Clear file input and preview
            document.getElementById('editMaquetteFiles').value = '';
            document.getElementById('editMaquettePreview').style.display = 'none';
            document.getElementById('editMaquettePreview').innerHTML = '';
            
            // Show modal
            document.getElementById('editMaquetteModal').style.display = 'flex';
        }

        function hideEditMaquette() {
            document.getElementById('editMaquetteModal').style.display = 'none';
            document.getElementById('editMaquetteForm').reset();
            document.getElementById('editMaquettePreview').style.display = 'none';
            document.getElementById('editMaquettePreview').innerHTML = '';
            currentRequestId = null;
        }

        // Edit Maquette Form submission
        document.getElementById('editMaquetteForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const notes = document.getElementById('editCompletionNotes').value.trim();
            const fileInput = document.getElementById('editMaquetteFiles');
            const hasNewFiles = fileInput.files.length > 0;
            
            const requestIndex = outlets[currentOutletCode].requests.findIndex(r => r.id === currentRequestId);
            if (requestIndex === -1) {
                alert('❌ Lỗi: Không tìm thấy yêu cầu');
                return;
            }
            
            // Update notes regardless of files
            outlets[currentOutletCode].requests[requestIndex].completionNotes = notes;
            
            if (hasNewFiles) {
                // Process new files if uploaded
                const newFiles = Array.from(fileInput.files);
                const filePromises = newFiles.map(file => {
                    return new Promise((resolve) => {
                        if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = function(e) {
                                resolve({
                                    name: file.name,
                                    type: file.type,
                                    data: e.target.result
                                });
                            };
                            reader.readAsDataURL(file);
                        } else {
                            resolve({
                                name: file.name,
                                type: file.type,
                                data: null
                            });
                        }
                    });
                });
                
                Promise.all(filePromises).then(fileData => {
                    // Replace old files with new ones
                    outlets[currentOutletCode].requests[requestIndex].maquetteFiles = fileData.map(f => f.name);
                    outlets[currentOutletCode].requests[requestIndex].maquetteData = fileData;
                    
                    // Update completion time
                    outlets[currentOutletCode].requests[requestIndex].completedAt = new Date().toLocaleString('vi-VN');
                    
                    saveData();
                    loadRequestList(currentOutletCode);
                    loadOutletList();
                    hideEditMaquette();
                    
                    alert('✅ Đã cập nhật maquette thành công!\n\n• Đã thay đổi files maquette\n• Đã cập nhật ghi chú\n• Đã cập nhật thời gian hoàn thành');
                });
            } else {
                // Only update notes, keep existing files
                saveData();
                loadRequestList(currentOutletCode);
                loadOutletList();
                hideEditMaquette();
                
                alert('✅ Đã cập nhật ghi chú thành công!\n\nFiles maquette giữ nguyên như cũ.');
            }
        });

        // Edit maquette file preview
        document.getElementById('editMaquetteFiles').addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const preview = document.getElementById('editMaquettePreview');
            
            if (files.length > 0) {
                preview.innerHTML = '';
                preview.style.display = 'grid';
                
                files.forEach((file, index) => {
                    const div = document.createElement('div');
                    div.className = 'relative bg-gray-50 border-2 border-dashed border-orange-300 rounded-lg p-3 text-center';
                    
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            div.innerHTML = `
                                <img src="${e.target.result}" alt="${file.name}" class="w-full h-24 object-cover rounded mb-2">
                                <p class="text-xs text-gray-600 truncate">${file.name}</p>
                                <p class="text-xs text-green-600">📷 Hình ảnh mới</p>
                            `;
                        };
                        reader.readAsDataURL(file);
                    } else if (file.type === 'application/pdf') {
                        div.innerHTML = `
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                                    <span class="text-2xl">📄</span>
                                </div>
                                <p class="text-xs text-gray-600 truncate">${file.name}</p>
                                <p class="text-xs text-red-600">PDF mới</p>
                            </div>
                        `;
                    } else {
                        div.innerHTML = `
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                                    <span class="text-2xl">📎</span>
                                </div>
                                <p class="text-xs text-gray-600 truncate">${file.name}</p>
                                <p class="text-xs text-gray-600">File mới</p>
                            </div>
                        `;
                    }
                    
                    preview.appendChild(div);
                });
            } else {
                preview.style.display = 'none';
            }
        });

        // User request functions
        function requestEditOutlet(code) {
            if (!checkPermission('view')) {
                alert('❌ Bạn không có quyền yêu cầu chỉnh sửa outlet!');
                return;
            }
            
            const outlet = outlets[code];
            if (!outlet) {
                alert('❌ Không tìm thấy outlet');
                return;
            }
            
            const content = prompt(`📝 YÊU CẦU CHỈNH SỬA OUTLET\n\nOutlet: ${outlet.name} (${code})\nKhu vực: ${outlet.area}\n\nVui lòng mô tả những thay đổi cần thiết:`);
            
            if (!content || content.trim() === '') {
                return;
            }
            
            // Initialize outlet edit requests if not exists
            if (!outlets[code].editRequests) {
                outlets[code].editRequests = [];
            }
            
            const newEditRequest = {
                id: Date.now(),
                content: content.trim(),
                timestamp: new Date().toLocaleString('vi-VN'),
                requesterName: currentUser.name,
                requesterRole: currentUser.position || currentUser.role,
                requesterEmail: currentUser.email,
                status: 'pending' // pending, approved, rejected
            };
            
            outlets[code].editRequests.push(newEditRequest);
            saveData();
            loadOutletList();
            
            alert(`✅ Đã gửi yêu cầu chỉnh sửa outlet!\n\nYêu cầu của bạn đã được gửi đến Admin để xem xét và phê duyệt.`);
        }
        
        function requestDeleteOutlet(code) {
            if (!checkPermission('view')) {
                alert('❌ Bạn không có quyền yêu cầu xóa outlet!');
                return;
            }
            
            const outlet = outlets[code];
            if (!outlet) {
                alert('❌ Không tìm thấy outlet');
                return;
            }
            
            const requestCount = outlet.requests ? outlet.requests.length : 0;
            const pendingCount = outlet.requests ? outlet.requests.filter(r => !r.completed).length : 0;
            
            let confirmMessage = `🗑️ YÊU CẦU XÓA OUTLET\n\n`;
            confirmMessage += `📋 Thông tin outlet:\n`;
            confirmMessage += `• Code: ${code}\n`;
            confirmMessage += `• Tên: ${outlet.name}\n`;
            confirmMessage += `• Khu vực: ${outlet.area}\n`;
            confirmMessage += `• Tổng yêu cầu: ${requestCount}\n`;
            
            if (pendingCount > 0) {
                confirmMessage += `• Chưa hoàn thành: ${pendingCount}\n`;
            }
            
            confirmMessage += `\nBạn có chắc chắn muốn yêu cầu xóa outlet này?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            const reason = prompt(`📝 LÝ DO XÓA OUTLET\n\nVui lòng nêu rõ lý do tại sao cần xóa outlet "${outlet.name}":`);
            
            if (!reason || reason.trim() === '') {
                return;
            }
            
            // Initialize outlet delete requests if not exists
            if (!outlets[code].deleteRequests) {
                outlets[code].deleteRequests = [];
            }
            
            const newDeleteRequest = {
                id: Date.now(),
                reason: reason.trim(),
                timestamp: new Date().toLocaleString('vi-VN'),
                requesterName: currentUser.name,
                requesterRole: currentUser.position || currentUser.role,
                requesterEmail: currentUser.email,
                status: 'pending' // pending, approved, rejected
            };
            
            outlets[code].deleteRequests.push(newDeleteRequest);
            saveData();
            loadOutletList();
            
            alert(`✅ Đã gửi yêu cầu xóa outlet!\n\nYêu cầu xóa outlet "${outlet.name}" đã được gửi đến Admin để xem xét.`);
        }
        
        function requestCancelRequest(requestId) {
            if (!checkPermission('view')) {
                alert('❌ Bạn không có quyền yêu cầu hủy!');
                return;
            }
            
            if (!currentOutletCode) {
                alert('❌ Lỗi: Không tìm thấy outlet hiện tại');
                return;
            }
            
            const request = outlets[currentOutletCode].requests.find(r => r.id === requestId);
            if (!request) {
                alert('❌ Lỗi: Không tìm thấy yêu cầu');
                return;
            }
            
            if (request.cancelRequested) {
                alert('⚠️ Yêu cầu này đã được yêu cầu hủy trước đó!');
                return;
            }
            
            if (request.completed) {
                if (!confirm(`⚠️ YÊU CẦU HỦY CÔNG VIỆC ĐÃ HOÀN THÀNH\n\nYêu cầu này đã được hoàn thành.\nBạn có chắc chắn muốn yêu cầu hủy không?`)) {
                    return;
                }
            }
            
            const reason = prompt(`📝 LÝ DO HỦY YÊU CẦU\n\nYêu cầu: ${request.requesterName} - ${request.createdAt}\n\nVui lòng nêu rõ lý do tại sao cần hủy yêu cầu này:`);
            
            if (!reason || reason.trim() === '') {
                return;
            }
            
            // Mark request as cancel requested
            const requestIndex = outlets[currentOutletCode].requests.findIndex(r => r.id === requestId);
            outlets[currentOutletCode].requests[requestIndex].cancelRequested = true;
            outlets[currentOutletCode].requests[requestIndex].cancelReason = reason.trim();
            outlets[currentOutletCode].requests[requestIndex].cancelRequestedBy = currentUser.name;
            outlets[currentOutletCode].requests[requestIndex].cancelRequestedAt = new Date().toLocaleString('vi-VN');
            outlets[currentOutletCode].requests[requestIndex].cancelRequestedRole = currentUser.position || currentUser.role;
            
            saveData();
            loadRequestList(currentOutletCode);
            loadOutletList();
            
            alert(`✅ Đã gửi yêu cầu hủy!\n\nYêu cầu hủy đã được gửi đến Admin để xem xét và phê duyệt.`);
        }
        
        function adminEditOutlet(code) {
            console.log('✅ adminEditOutlet function called with code:', code);
            console.log('✅ Current user:', currentUser);
            console.log('✅ Checking permissions...');
            
            if (!checkPermission('manage')) {
                console.log('❌ Permission denied');
                alert('❌ Bạn không có quyền chỉnh sửa outlet!');
                return;
            }
            
            console.log('✅ Permission granted');
            console.log('✅ Looking for outlet:', code);
            console.log('✅ Available outlets:', Object.keys(outlets));
            
            const outlet = outlets[code];
            if (!outlet) {
                console.log('❌ Outlet not found');
                alert('❌ Không tìm thấy outlet');
                return;
            }
            
            console.log('✅ Outlet found:', outlet);
            console.log('✅ Populating form...');
            
            // Populate form with current data
            const codeElement = document.getElementById('editOutletCode');
            const nameElement = document.getElementById('editOutletName');
            const addressElement = document.getElementById('editOutletAddress');
            const areaElement = document.getElementById('editOutletArea');
            
            console.log('✅ Form elements found:', {
                codeElement: !!codeElement,
                nameElement: !!nameElement,
                addressElement: !!addressElement,
                areaElement: !!areaElement
            });
            
            if (codeElement) codeElement.value = code;
            if (nameElement) nameElement.value = outlet.name;
            if (addressElement) addressElement.value = outlet.address || '';
            if (areaElement) areaElement.value = outlet.area;
            
            console.log('✅ Form populated, showing modal...');
            
            // Show modal
            const modal = document.getElementById('editOutletModal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('✅ Modal displayed successfully');
            } else {
                console.log('❌ Modal element not found');
            }
        }

        function hideEditOutlet() {
            document.getElementById('editOutletModal').style.display = 'none';
            document.getElementById('editOutletForm').reset();
        }

        function deleteOutlet(code) {
            if (!checkPermission('manage')) {
                alert('❌ Bạn không có quyền xóa outlet!');
                return;
            }
            const outlet = outlets[code];
            if (!outlet) {
                alert('❌ Không tìm thấy outlet');
                return;
            }
            
            const requestCount = outlet.requests ? outlet.requests.length : 0;
            const pendingCount = outlet.requests ? outlet.requests.filter(r => !r.completed).length : 0;
            
            // First confirmation
            let confirmMessage = `🗑️ XÁC NHẬN XÓA OUTLET\n\n`;
            confirmMessage += `📋 Thông tin outlet:\n`;
            confirmMessage += `• Code: ${code}\n`;
            confirmMessage += `• Tên: ${outlet.name}\n`;
            confirmMessage += `• Khu vực: ${outlet.area}\n`;
            confirmMessage += `• Tổng yêu cầu: ${requestCount}\n`;
            confirmMessage += `• Chưa hoàn thành: ${pendingCount}\n\n`;
            
            if (requestCount > 0) {
                confirmMessage += `⚠️ CẢNH BÁO: Outlet này có ${requestCount} yêu cầu!\n`;
                if (pendingCount > 0) {
                    confirmMessage += `🚨 Trong đó có ${pendingCount} yêu cầu chưa hoàn thành!\n`;
                }
                confirmMessage += `\n❗ Việc xóa sẽ xóa vĩnh viễn tất cả dữ liệu!\n`;
                confirmMessage += `\nBạn có chắc chắn muốn tiếp tục?`;
            } else {
                confirmMessage += `ℹ️ Outlet này chưa có yêu cầu nào.\n`;
                confirmMessage += `\nBạn có chắc chắn muốn xóa outlet này?`;
            }
            
            const firstConfirm = confirm(confirmMessage);
            if (!firstConfirm) {
                return;
            }
            
            // Second confirmation (always show for any outlet)
            let secondMessage = `🚨 XÁC NHẬN LẦN CUỐI!\n\n`;
            secondMessage += `Bạn sắp xóa vĩnh viễn outlet:\n`;
            secondMessage += `"${outlet.name}" (${code})\n\n`;
            
            if (requestCount > 0) {
                secondMessage += `⚠️ Sẽ mất ${requestCount} yêu cầu`;
                if (pendingCount > 0) {
                    secondMessage += ` (${pendingCount} chưa xong)`;
                }
                secondMessage += `!\n`;
            }
            
            secondMessage += `\n❌ KHÔNG THỂ KHÔI PHỤC SAU KHI XÓA!\n`;
            secondMessage += `\nBạn có thực sự muốn xóa không?`;
            
            const finalConfirm = confirm(secondMessage);
            if (!finalConfirm) {
                return;
            }
            
            try {
                // Delete outlet
                delete outlets[code];
                saveData();
                
                // Hide detail section if current outlet is deleted
                if (currentOutletCode === code) {
                    document.getElementById('outletDetailSection').style.display = 'none';
                    currentOutletCode = null;
                }
                
                // Reload lists
                loadOutletList();
                
                alert(`✅ ĐÃ XÓA THÀNH CÔNG!\n\nOutlet "${outlet.name}" (${code}) đã được xóa vĩnh viễn.`);
                
            } catch (error) {
                console.error('Error deleting outlet:', error);
                alert('❌ Lỗi khi xóa outlet. Vui lòng thử lại!');
            }
        }

        // Edit Outlet Form submission
        document.getElementById('editOutletForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const code = document.getElementById('editOutletCode').value.trim();
            const name = document.getElementById('editOutletName').value.trim();
            const address = document.getElementById('editOutletAddress').value.trim();
            const area = document.getElementById('editOutletArea').value;
            
            if (!outlets[code]) {
                alert('❌ Lỗi: Không tìm thấy outlet');
                return;
            }
            
            if (!address) {
                alert('❌ Vui lòng nhập địa chỉ outlet!');
                return;
            }
            
            // Update outlet data
            outlets[code].name = name;
            outlets[code].address = address;
            outlets[code].area = area;
            
            saveData();
            loadOutletList();
            hideEditOutlet();
            
            // Update detail section if currently viewing this outlet
            if (currentOutletCode === code) {
                document.getElementById('outletDetailTitle').textContent = `Chi Tiết Outlet: ${name}`;
                document.getElementById('outletDetailInfo').textContent = `Code: ${code} | Khu vực: ${area}`;
            }
            
            alert(`✅ Đã cập nhật outlet "${name}" thành công!`);
        });

        function editRequest(requestId) {
            console.log('✅ editRequest called with ID:', requestId);
            console.log('✅ currentOutletCode:', currentOutletCode);
            
            if (!currentOutletCode) {
                console.error('❌ currentOutletCode is null');
                alert('❌ Lỗi: Không tìm thấy outlet hiện tại');
                return;
            }
            
            if (!outlets[currentOutletCode]) {
                console.error('❌ Outlet not found:', currentOutletCode);
                alert('❌ Lỗi: Outlet không tồn tại');
                return;
            }
            
            const request = outlets[currentOutletCode].requests.find(r => r.id === requestId);
            console.log('✅ Found request:', request);
            
            if (!request) {
                console.error('❌ Request not found:', requestId);
                alert('❌ Lỗi: Không tìm thấy yêu cầu');
                return;
            }
            
            currentRequestId = requestId;
            
            // Populate basic request info
            let basicInfo = `
                <div><strong>👤 Người yêu cầu:</strong> ${request.requesterName}</div>
                <div><strong>🕒 Ngày tạo:</strong> ${request.createdAt}</div>
                <div><strong>📍 Địa chỉ:</strong> ${request.address}</div>
            `;
            
            if (request.requestItems && request.requestItems.length > 0) {
                basicInfo += `<div><strong>📦 Hạng mục:</strong> ${request.requestItems.length} hạng mục</div>`;
            }
            
            const basicInfoElement = document.getElementById('editRequestBasicInfo');
            if (basicInfoElement) {
                basicInfoElement.innerHTML = basicInfo;
                console.log('✅ Basic info populated');
            } else {
                console.error('❌ editRequestBasicInfo element not found');
            }
            
            // Update UI based on user role
            updateEditRequestUI();
            
            // Load edit history
            loadEditHistory(request);
            
            // Clear form
            const contentElement = document.getElementById('editRequestContent');
            if (contentElement) {
                contentElement.value = '';
                console.log('✅ Form cleared');
            }
            
            // Show modal
            const modal = document.getElementById('editRequestModal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('✅ Modal displayed');
            } else {
                console.error('❌ editRequestModal not found');
            }
        }

        function updateEditRequestUI() {
            const isAdmin = currentUser && currentUser.role === 'admin';
            
            const commentRoleTitle = document.getElementById('commentRoleTitle');
            const commentLabel = document.getElementById('commentLabel');
            const commentHint = document.getElementById('commentHint');
            const textarea = document.getElementById('editRequestContent');
            const markDoneBtn = document.getElementById('markDoneBtn');
            
            if (isAdmin) {
                // Admin - có cả nút Gửi và nút Xong
                commentRoleTitle.textContent = 'Yêu Cầu Chỉnh Sửa';
                commentLabel.textContent = 'Nội Dung *';
                commentHint.textContent = 'Mô tả chi tiết';
                textarea.placeholder = 'Nhập nội dung...';
                markDoneBtn.textContent = 'Xong';
                markDoneBtn.style.display = 'block';
            } else {
                // User - chỉ có nút Gửi
                commentRoleTitle.textContent = 'Yêu Cầu Chỉnh Sửa';
                commentLabel.textContent = 'Nội Dung *';
                commentHint.textContent = 'Mô tả chi tiết';
                textarea.placeholder = 'Nhập nội dung...';
                markDoneBtn.style.display = 'none';
            }
        }

        function loadEditHistory(request) {
            const historyContainer = document.getElementById('editHistoryList');
            const historyCount = document.getElementById('editHistoryCount');
            
            if (!request.editHistory || request.editHistory.length === 0) {
                historyContainer.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">Chưa có chỉnh sửa nào</div>';
                historyCount.textContent = '0';
                return;
            }
            
            historyContainer.innerHTML = '';
            historyCount.textContent = request.editHistory.length;
            
            // Sort by newest first
            const sortedHistory = [...request.editHistory].sort((a, b) => parseVietnameseDate(b.timestamp) - parseVietnameseDate(a.timestamp));
            
            sortedHistory.forEach((edit, index) => {
                const div = document.createElement('div');
                div.className = `border-l-4 ${edit.isFixed ? 'border-green-400 bg-green-50' : 'border-orange-400 bg-orange-50'} p-3 rounded-r-lg mb-2`;
                
                // Author info with role-based styling
                const authorName = edit.authorName || (edit.author === 'Admin' ? 'Admin' : 'User');
                let authorDisplay = '';
                
                if (edit.author === 'Admin') {
                    authorDisplay = `<span class="text-red-600 font-semibold">🔧 ${authorName} (Admin)</span>`;
                } else if (edit.author === 'SR/TBA') {
                    authorDisplay = `<span class="text-blue-600 font-semibold">👤 ${authorName} (SR/TBA)</span>`;
                } else if (edit.author === 'SS') {
                    authorDisplay = `<span class="text-green-600 font-semibold">👥 ${authorName} (SS)</span>`;
                } else {
                    authorDisplay = `<span class="text-gray-600 font-semibold">📝 ${authorName}</span>`;
                }
                
                div.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <div class="text-xs text-gray-600">
                            ${authorDisplay} • ${edit.timestamp}
                        </div>
                        <span class="text-xs ${edit.isFixed ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100'} px-2 py-1 rounded-full">
                            ${edit.isFixed ? '✅ Đã sửa' : '🔧 Cần sửa'}
                        </span>
                    </div>
                    <div class="text-sm text-gray-800">${edit.content}</div>
                `;
                
                historyContainer.appendChild(div);
            });
        }

        // Helper function to calculate time ago
        function getTimeAgo(date) {
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffMins < 1) return 'Vừa xong';
            if (diffMins < 60) return `${diffMins} phút trước`;
            if (diffHours < 24) return `${diffHours} giờ trước`;
            if (diffDays < 7) return `${diffDays} ngày trước`;
            return `${Math.floor(diffDays / 7)} tuần trước`;
        }

        function hideEditRequest() {
            document.getElementById('editRequestModal').style.display = 'none';
            document.getElementById('editRequestForm').reset();
            currentRequestId = null;
        }

        function submitComment(isFixed) {
            const content = document.getElementById('editRequestContent').value.trim();
            
            if (!content) {
                alert('❌ Vui lòng nhập nội dung!');
                return;
            }
            
            const requestIndex = outlets[currentOutletCode].requests.findIndex(r => r.id === currentRequestId);
            if (requestIndex === -1) {
                alert('❌ Lỗi: Không tìm thấy yêu cầu');
                return;
            }
            
            // Initialize edit history if not exists
            if (!outlets[currentOutletCode].requests[requestIndex].editHistory) {
                outlets[currentOutletCode].requests[requestIndex].editHistory = [];
            }
            
            const isAdmin = currentUser && currentUser.role === 'admin';
            
            // Add new edit entry
            const newEdit = {
                id: Date.now(),
                content: content,
                timestamp: new Date().toLocaleString('vi-VN'),
                isFixed: isFixed,
                author: isAdmin ? 'Admin' : currentUser.position || 'User',
                authorName: currentUser.name || 'Unknown User',
                authorEmail: currentUser.email || null
            };
            
            outlets[currentOutletCode].requests[requestIndex].editHistory.push(newEdit);
            
            // If marked as fixed, mark all previous edits as fixed too
            if (isFixed) {
                outlets[currentOutletCode].requests[requestIndex].editHistory.forEach(edit => {
                    edit.isFixed = true;
                });
            }
            
            saveData();
            loadRequestList(currentOutletCode);
            loadOutletList();
            
            if (isFixed) {
                alert(`✅ Đã lưu và đánh dấu hoàn thành!\n\nTất cả yêu cầu chỉnh sửa đã được đánh dấu là hoàn thành.`);
                hideEditRequest();
            } else {
                alert(`💬 Đã gửi yêu cầu chỉnh sửa!\n\nComment đã được lưu vào lịch sử. Modal vẫn mở để bạn có thể tiếp tục thêm comment.`);
                
                // Clear form but keep modal open
                document.getElementById('editRequestContent').value = '';
                
                // Reload edit history to show new comment
                const request = outlets[currentOutletCode].requests.find(r => r.id === currentRequestId);
                if (request) {
                    loadEditHistory(request);
                }
            }
        }



        // Character counter for edit request textarea
        document.addEventListener('DOMContentLoaded', function() {
            const textarea = document.getElementById('editRequestContent');
            const charCount = document.getElementById('charCount');
            
            if (textarea && charCount) {
                textarea.addEventListener('input', function() {
                    const count = this.value.length;
                    charCount.textContent = `${count} ký tự`;
                    
                    // Change color based on length
                    if (count < 10) {
                        charCount.className = 'text-xs text-gray-400';
                    } else if (count < 100) {
                        charCount.className = 'text-xs text-blue-500';
                    } else if (count < 500) {
                        charCount.className = 'text-xs text-green-500';
                    } else {
                        charCount.className = 'text-xs text-orange-500';
                    }
                });
            }
        });

        // Dropdown functions
        function toggleDropdown(code) {
            const dropdown = document.getElementById(`dropdown-${code}`);
            const arrow = document.querySelector(`.dropdown-arrow-${code}`);
            
            // Close all other dropdowns first
            document.querySelectorAll('[id^="dropdown-"]').forEach(dd => {
                if (dd.id !== `dropdown-${code}`) {
                    dd.classList.add('hidden');
                }
            });
            
            // Reset all arrows
            document.querySelectorAll('[class*="dropdown-arrow-"]').forEach(arr => {
                if (!arr.classList.contains(`dropdown-arrow-${code}`)) {
                    arr.style.transform = 'rotate(0deg)';
                }
            });
            
            // Toggle current dropdown
            if (dropdown.classList.contains('hidden')) {
                dropdown.classList.remove('hidden');
                arrow.style.transform = 'rotate(180deg)';
            } else {
                dropdown.classList.add('hidden');
                arrow.style.transform = 'rotate(0deg)';
            }
        }

        function hideDropdown(code) {
            const dropdown = document.getElementById(`dropdown-${code}`);
            const arrow = document.querySelector(`.dropdown-arrow-${code}`);
            
            if (dropdown) {
                dropdown.classList.add('hidden');
            }
            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
            }
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('[onclick*="toggleDropdown"]') && !event.target.closest('[id^="dropdown-"]')) {
                document.querySelectorAll('[id^="dropdown-"]').forEach(dropdown => {
                    dropdown.classList.add('hidden');
                });
                document.querySelectorAll('[class*="dropdown-arrow-"]').forEach(arrow => {
                    arrow.style.transform = 'rotate(0deg)';
                });
            }
        });

        // Device Detection and Mobile Optimization
        function detectDevice() {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
            const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth > 768 && window.innerWidth <= 1024;
            
            // Add device classes to body
            document.body.classList.remove('is-mobile', 'is-tablet', 'is-desktop');
            
            if (isMobile) {
                document.body.classList.add('is-mobile');
                optimizeForMobile();
            } else if (isTablet) {
                document.body.classList.add('is-tablet');
                optimizeForTablet();
            } else {
                document.body.classList.add('is-desktop');
                optimizeForDesktop();
            }
            
            return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
        }

        function optimizeForMobile() {
            // Apply mobile-specific optimizations
            console.log('📱 Mobile device detected - applying mobile optimizations');
            
            // Make modals full screen on mobile
            const modals = document.querySelectorAll('[id$="Modal"]');
            modals.forEach(modal => {
                const modalContent = modal.querySelector('.slide-in, .bg-white');
                if (modalContent) {
                    modalContent.classList.add('mobile-modal');
                }
            });
            
            // Optimize table for mobile scrolling
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
                const container = table.closest('.overflow-x-auto');
                if (container) {
                    container.classList.add('mobile-table');
                }
            });
        }

        function optimizeForTablet() {
            console.log('📱 Tablet device detected - applying tablet optimizations');
            // Tablet-specific optimizations can be added here
        }

        function optimizeForDesktop() {
            console.log('🖥️ Desktop device detected - applying desktop optimizations');
            // Desktop-specific optimizations can be added here
        }

        // Handle window resize for responsive behavior
        function handleResize() {
            detectDevice();
            
            // Update table layout based on screen size
            const device = detectDevice();
            if (device.isMobile) {
                // Force horizontal scroll for tables on mobile
                document.querySelectorAll('.overflow-x-auto').forEach(container => {
                    container.style.overflowX = 'auto';
                });
            }
        }

        // Optimize touch interactions for mobile
        function optimizeTouchInteractions() {
            // Add touch-friendly classes to buttons
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                if (!button.classList.contains('touch-btn')) {
                    button.classList.add('touch-btn');
                }
            });
            
            // Optimize dropdown behavior for mobile
            const dropdowns = document.querySelectorAll('[id^="dropdown-"]');
            dropdowns.forEach(dropdown => {
                if (detectDevice().isMobile) {
                    dropdown.classList.add('mobile-dropdown');
                }
            });
        }

        // Enhanced loadOutletList for mobile optimization
        function loadOutletListMobile() {
            loadOutletList(); // Call original function
            
            // Apply mobile-specific table optimizations
            if (detectDevice().isMobile) {
                const tbody = document.getElementById('outletTableBody');
                const rows = tbody.querySelectorAll('tr');
                
                rows.forEach(row => {
                    // Make table cells more touch-friendly
                    const cells = row.querySelectorAll('td');
                    cells.forEach(cell => {
                        cell.classList.add('mobile-py-2');
                    });
                    
                    // Optimize button sizes for mobile
                    const buttons = row.querySelectorAll('button');
                    buttons.forEach(button => {
                        button.classList.add('mobile-btn', 'touch-btn');
                    });
                });
            }
        }

        // Override original loadOutletList
        const originalLoadOutletList = loadOutletList;
        loadOutletList = function() {
            originalLoadOutletList();
            
            // Apply mobile optimizations after loading
            setTimeout(() => {
                if (detectDevice().isMobile) {
                    optimizeTouchInteractions();
                }
            }, 100);
        };

        // Initialize device detection
        window.addEventListener('load', () => {
            detectDevice();
            optimizeTouchInteractions();
        });

        // Handle orientation change and resize
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 100); // Delay to ensure orientation change is complete
        });

        // Mobile Menu Toggle Function
        function toggleMobileMenu() {
            openMobilePendingOverlay();
        }
        
        // Open Mobile Pending Overlay
        function openMobilePendingOverlay() {
            const overlay = document.getElementById('mobilePendingOverlay');
            const hamburgerLine1 = document.getElementById('hamburger-line-1');
            const hamburgerLine2 = document.getElementById('hamburger-line-2');
            const hamburgerLine3 = document.getElementById('hamburger-line-3');
            
            // Show overlay
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            
            // Slide in from right
            setTimeout(() => {
                overlay.style.transform = 'translateX(0)';
            }, 10);
            
            // Transform hamburger to X
            hamburgerLine1.style.transform = 'rotate(45deg) translate(6px, 6px)';
            hamburgerLine2.style.opacity = '0';
            hamburgerLine3.style.transform = 'rotate(-45deg) translate(6px, -6px)';
            
            // Update button title
            document.getElementById('mobileMenuToggle').title = 'Đóng danh sách outlet chưa hoàn thành';
            
            // Update stats
            updatePendingStats();
        }
        
        // Close Mobile Pending Overlay
        function closeMobilePendingOverlay() {
            const overlay = document.getElementById('mobilePendingOverlay');
            const hamburgerLine1 = document.getElementById('hamburger-line-1');
            const hamburgerLine2 = document.getElementById('hamburger-line-2');
            const hamburgerLine3 = document.getElementById('hamburger-line-3');
            
            // Slide out to right
            overlay.style.transform = 'translateX(100%)';
            
            // Hide overlay after animation
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
            
            // Transform X back to hamburger
            hamburgerLine1.style.transform = 'rotate(0) translate(0, 0)';
            hamburgerLine2.style.opacity = '1';
            hamburgerLine3.style.transform = 'rotate(0) translate(0, 0)';
            
            // Update button title
            document.getElementById('mobileMenuToggle').title = 'Xem outlet chưa hoàn thành';
        }
        
        // Update Pending Stats
        function updatePendingStats() {
            const statsElement = document.getElementById('pendingStatsOverlay');
            if (!statsElement) return;
            
            let totalPending = 0;
            let totalEdits = 0;
            
            for (const [code, outlet] of Object.entries(outlets)) {
                const allRequests = outlet.requests || [];
                const pendingRequests = allRequests.filter(r => !r.completed);
                const needsEditRequests = allRequests.filter(r => {
                    return r.editHistory && r.editHistory.length > 0 && 
                           r.editHistory.some(edit => !edit.isFixed);
                });
                
                totalPending += pendingRequests.length;
                totalEdits += needsEditRequests.length;
            }
            
            const totalOutlets = Object.keys(outlets).length;
            const pendingOutlets = Object.values(outlets).filter(outlet => {
                const allRequests = outlet.requests || [];
                const pendingRequests = allRequests.filter(r => !r.completed);
                const needsEditRequests = allRequests.filter(r => {
                    return r.editHistory && r.editHistory.length > 0 && 
                           r.editHistory.some(edit => !edit.isFixed);
                });
                return pendingRequests.length > 0 || needsEditRequests.length > 0;
            }).length;
            
            statsElement.textContent = `${pendingOutlets}/${totalOutlets} outlet • ${totalPending} chưa xong • ${totalEdits} cần sửa`;
        }

        // Initialize
        checkSession();

(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'98780e4233d6f936',t:'MTc1OTI4MDc2OC4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();


// --- Added helpers to enable direct user edit and admin notification ---
function openEditForm(id){
    // try to find an element representing the outlet and make it editable
    const el = document.querySelector('[data-outlet-id="'+id+'"]') || document.getElementById(id);
    if(!el){
        console.warn('Outlet element not found for edit:', id);
        return;
    }
    // create a simple inline edit popup/modal (basic)
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.innerHTML = `
        <div class="edit-modal-content">
            <h3>Chỉnh sửa outlet</h3>
            <textarea class="edit-text" rows="6">${el.innerText.replace(/`/g,'\`')}</textarea>
            <div style="margin-top:8px">
                <button class="save-edit">Lưu</button>
                <button class="cancel-edit">Hủy</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.cancel-edit').onclick = ()=> modal.remove();
    modal.querySelector('.save-edit').onclick = ()=> {
        const newVal = modal.querySelector('.edit-text').value;
        // apply change to element (basic approach)
        el.innerText = newVal;
        modal.remove();
        // notify admin that outlet was edited
        notifyAdminEditedOrDeleted(id, 'edited');
    };
}

function saveEdit(id, data){
    // legacy alias - call openEditForm for client-side editing
    openEditForm(id);
}


function performDelete(id){
    // Basic deletion: remove element from DOM
    const el = document.querySelector('[data-outlet-id="'+id+'"]') || document.getElementById(id);
    if(el){ el.remove(); }
}


function notifyAdminEditedOrDeleted(id, action){
    // Show a simple notification in a fixed admin area; if admin is viewing, they will see it.
    // Create an admin-notify container if not present
    let container = document.getElementById('admin-notify-area');
    if(!container){
        container = document.createElement('div');
        container.id = 'admin-notify-area';
        container.style.position = 'fixed';
        container.style.right = '16px';
        container.style.top = '16px';
        container.style.zIndex = 99999;
        document.body.appendChild(container);
    }
    const msg = document.createElement('div');
    msg.className = 'admin-notify';
    msg.innerText = `Outlet ${id} đã được ${action} bởi user.`;
    msg.style.padding = '10px 14px';
    msg.style.borderRadius = '6px';
    msg.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    msg.style.background = '#fff8c6';
    msg.style.marginBottom = '8px';
    container.appendChild(msg);
    // auto-remove after 12s
    setTimeout(()=> msg.remove(), 12000);
}
