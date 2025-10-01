// Data storage
        let outlets = {};
        async function loadOutletsFromSupabase() {
            try {
                const { data: outletData, error } = await supabase.from('outlets').select('*');
                if (error) throw error;
                outlets = {};
                outletData.forEach(outlet => {
                    outlets[outlet.code] = {
                        name: outlet.name,
                        address: outlet.address,
                        area: outlet.area,
                        requests: outlet.requests || []
                    };
                });
                loadOutletList();
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu từ Supabase:', error.message);
                alert('❌ Không thể tải dữ liệu outlet từ Supabase!');
            }
        }

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
            }

            // Load data
            loadOutletsFromSupabase();
        }

        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            if (login(username, password)) {
                initializeUI();
            } else {
                alert('❌ Tài khoản hoặc mật khẩu không đúng!');
            }
        });

        document.getElementById('createOutletBtnDesktop').addEventListener('click', showCreateOutlet);
        document.getElementById('createOutletBtnMobile').addEventListener('click', showCreateOutlet);

        document.getElementById('createOutletForm').addEventListener('submit', async function(e) {
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
            if (!/^\d{8}$/.test(code)) {
                alert('❌ Outlet Code không hợp lệ!\n\nCode phải có đúng 8 chữ số (VD: 10000001, 20000001, 12345678)');
                checkOutletCodeExists(code);
                return;
            }
            if (outlets[code]) {
                alert(`❌ Outlet Code "${code}" đã tồn tại!\n\nOutlet: "${outlets[code].name}" - ${outlets[code].area}`);
                checkOutletCodeExists(code);
                return;
            }

            try {
                const { error } = await supabase.from('outlets').insert([{ code, name, address, area, requests: [] }]);
                if (error) throw error;
                outlets[code] = { name, address, area, requests: [] };
                loadOutletList();
                hideCreateOutlet();
                alert(`✅ Tạo outlet thành công!\n\nOutlet Code: ${code}\nTên: ${name}\nĐịa chỉ: ${address}\nKhu vực: ${area}`);
            } catch (error) {
                console.error('Lỗi tạo outlet:', error.message);
                alert('❌ Lỗi khi tạo outlet!');
            }
        });

        document.getElementById('newRequestForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const requesterName = document.getElementById('requesterName').value.trim();
            const address = document.getElementById('requestAddress').value.trim();
            const content = document.getElementById('requestContent').value.trim();
            const imageFiles = document.getElementById('requestImage').files;

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

                if (!type || !brand) {
                    hasIncompleteItem = true;
                    incompleteItemIndex = index + 1;
                    return;
                }
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

                try {
                    const updatedRequests = outlets[currentOutletCode].requests ? [...outlets[currentOutletCode].requests, newRequest] : [newRequest];
                    const { error } = await supabase.from('outlets').update({ requests: updatedRequests }).eq('code', currentOutletCode);
                    if (error) throw error;
                    outlets[currentOutletCode].requests = updatedRequests;
                    loadRequestList(currentOutletCode);
                    loadOutletList();
                    hideNewRequestForm();
                    alert('Tạo yêu cầu thành công!');
                } catch (error) {
                    console.error('Lỗi tạo yêu cầu:', error.message);
                    alert('❌ Lỗi khi tạo yêu cầu!');
                }
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
                    requestInfo += `<div class="ml-4 text-sm">• ${item.type} - ${item.brand}</div>`;
                });
            }
            document.getElementById('requestInfo').innerHTML = requestInfo;

            document.getElementById('uploadMaquetteModal').style.display = 'flex';
        }

        document.getElementById('uploadMaquetteForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const fileInput = document.getElementById('maquetteFile');
            const notes = document.getElementById('maquetteNotes').value.trim();
            if (!fileInput.files.length) {
                alert('❌ Vui lòng chọn file maquette!');
                return;
            }
            const files = Array.from(fileInput.files);
            const filePromises = [];
            files.forEach(file => {
                const promise = new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        resolve({ name: file.name, data: event.target.result });
                    };
                    reader.readAsDataURL(file);
                });
                filePromises.push(promise);
            });

            Promise.all(filePromises).then(async fileData => {
                const requestIndex = outlets[currentOutletCode].requests.findIndex(r => r.id === currentRequestId);
                if (requestIndex === -1) {
                    alert('❌ Lỗi: Không tìm thấy yêu cầu');
                    return;
                }

                outlets[currentOutletCode].requests[requestIndex].completed = true;
                outlets[currentOutletCode].requests[requestIndex].completedAt = new Date().toLocaleString('vi-VN');
                outlets[currentOutletCode].requests[requestIndex].maquetteFiles = fileData.map(f => f.name);
                outlets[currentOutletCode].requests[requestIndex].maquetteData = fileData;
                outlets[currentOutletCode].requests[requestIndex].completionNotes = notes;
                
                try {
                    const updatedRequests = outlets[currentOutletCode].requests;
                    const { error } = await supabase.from('outlets').update({ requests: updatedRequests }).eq('code', currentOutletCode);
                    if (error) throw error;
                    loadRequestList(currentOutletCode);
                    loadOutletList();
                    hideUploadMaquette();
                    alert('✅ Đã xác nhận hoàn thành yêu cầu!');
                } catch (error) {
                    console.error('Lỗi khi xác nhận hoàn thành yêu cầu:', error.message);
                    alert('❌ Lỗi khi xác nhận hoàn thành yêu cầu!');
                }
            });
        });

        // If only updating notes (no new file)
        document.getElementById('uploadMaquetteForm').addEventListener('submit', async function(e) {
            // (handled above in same form handler with files present)
        });

        function uploadMaquette(requestId) {
            // (Already handled above)
        }

        function showCreateOutlet() {
            document.getElementById('newOutletModal').style.display = 'flex';
        }
        function hideCreateOutlet() {
            document.getElementById('newOutletModal').style.display = 'none';
            document.getElementById('createOutletForm').reset();
        }
        function hideNewRequestForm() {
            document.getElementById('newRequestModal').style.display = 'none';
            document.getElementById('newRequestForm').reset();
        }
        function hideUploadMaquette() {
            document.getElementById('uploadMaquetteModal').style.display = 'none';
            document.getElementById('uploadMaquetteForm').reset();
        }

        function viewOutlet(code) {
            const outlet = outlets[code];
            if (!outlet) return;
            currentOutletCode = code;
            document.getElementById('outletDetailSection').style.display = 'block';
            document.getElementById('outletDetailTitle').textContent = `Chi Tiết Outlet: ${outlet.name}`;
            document.getElementById('outletDetailInfo').textContent = `Code: ${code} | Khu vực: ${outlet.area}`;
            loadRequestList(code);
            highlightSelectedOutlet(code);
        }

        function loadOutletList() {
            // (Hiển thị danh sách outlets dựa trên đối tượng outlets)
        }

        function loadRequestList(code) {
            // (Hiển thị danh sách requests của outlet có code)
        }

        function highlightSelectedOutlet(code) {
            // (Đánh dấu outlet đã chọn trong bảng)
        }

        // Các hàm liên quan đến editRequest vẫn giữ nguyên nội dung, nhưng submitComment cần async
        async function submitComment(isFixed) {
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
            if (!outlets[currentOutletCode].requests[requestIndex].editHistory) {
                outlets[currentOutletCode].requests[requestIndex].editHistory = [];
            }
            const isAdmin = currentUser && currentUser.role === 'admin';
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
            if (isFixed) {
                outlets[currentOutletCode].requests[requestIndex].editHistory.forEach(edit => {
                    edit.isFixed = true;
                });
            }
            try {
                const updatedRequests = outlets[currentOutletCode].requests;
                const { error } = await supabase.from('outlets').update({ requests: updatedRequests }).eq('code', currentOutletCode);
                if (error) throw error;
                loadRequestList(currentOutletCode);
                loadOutletList();
                if (isFixed) {
                    alert(`✅ Đã lưu và đánh dấu hoàn thành!\n\nTất cả yêu cầu chỉnh sửa đã được đánh dấu là hoàn thành.`);
                    hideEditRequest();
                } else {
                    alert(`💬 Đã gửi yêu cầu chỉnh sửa!\n\nComment đã được lưu vào lịch sử. Modal vẫn mở để bạn có thể tiếp tục thêm comment.`);
                    document.getElementById('editRequestContent').value = '';
                    const request = outlets[currentOutletCode].requests.find(r => r.id === currentRequestId);
                    if (request) {
                        loadEditHistory(request);
                    }
                }
            } catch (error) {
                console.error('Lỗi khi gửi comment:', error.message);
                alert('❌ Lỗi khi lưu comment chỉnh sửa!');
            }
        }

        function editRequest(requestId) {
            if (!currentOutletCode) {
                alert('❌ Lỗi: Không tìm thấy outlet hiện tại');
                return;
            }
            const request = outlets[currentOutletCode].requests.find(r => r.id === requestId);
            if (!request) {
                alert('❌ Lỗi: Không tìm thấy yêu cầu');
                return;
            }
            currentRequestId = requestId;
            let basicInfo = `
                <div><strong>👤 Người yêu cầu:</strong> ${request.requesterName}</div>
                <div><strong>🕒 Ngày tạo:</strong> ${request.createdAt}</div>
                <div><strong>📍 Địa chỉ:</strong> ${request.address}</div>
            `;
            if (request.requestItems && request.requestItems.length > 0) {
                basicInfo += `<div><strong>📦 Hạng mục:</strong> ${request.requestItems.length} hạng mục</div>`;
            }
            document.getElementById('editRequestBasicInfo').innerHTML = basicInfo;
            updateEditRequestUI();
            loadEditHistory(request);
            document.getElementById('editRequestContent').value = '';
            document.getElementById('editRequestModal').style.display = 'flex';
        }

        function hideEditRequest() {
            document.getElementById('editRequestModal').style.display = 'none';
            document.getElementById('editRequestForm').reset();
            currentRequestId = null;
        }

        document.addEventListener('DOMContentLoaded', function() {
            detectDevice();
            window.addEventListener('resize', handleResize);
        });
