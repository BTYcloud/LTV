// 添加动画样式
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.6;
            }
        }
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
    `;
    document.head.appendChild(style);
})();

/**
 * 格式化版本号为可读形式，支持自定义格式和标准12位格式。
 * @param {string} versionString - 未格式化的版本号字符串
 * @returns {string} 格式化后的版本号
 */
function formatVersion(versionString) {
    if (!versionString) {
        return '未知版本';
    }

    const cleanedString = versionString.trim();

    // 如果是自定义的Beta格式 (e.g., beta0.3.05 -> Beta 0.3.05)
    if (cleanedString.toLowerCase().startsWith('beta')) {
        const parts = cleanedString.toLowerCase().replace('beta', '').split('.');
        const major = parts[0] ? parseInt(parts[0], 10) : 0;
        const minor = parts[1] ? parseInt(parts[1], 10) : 0;
        const patch = parts[2] ? parseInt(parts[2], 10) : 0;
        
        return `Beta ${major}.${minor}.${patch}`;
    }

    // 如果是标准12位版本号 (e.g., 202310271530 -> 2023-10-27 15:30)
    if (cleanedString.length === 12) {
        const year = cleanedString.substring(0, 4);
        const month = cleanedString.substring(4, 6);
        const day = cleanedString.substring(6, 8);
        const hour = cleanedString.substring(8, 10);
        const minute = cleanedString.substring(10, 12);
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }

    // 其他格式直接返回
    return cleanedString;
}

/**
 * 比较两个版本号字符串
 * 支持 "1.2.3" 和 "Beta1.2.3" 格式的比较
 * @param {string} v1 - 版本号字符串1
 * @param {string} v2 - 版本号字符串2
 * @returns {number} 如果 v1 > v2 返回 1, v1 < v2 返回 -1, 否则返回 0
 */
function compareVersions(v1, v2) {
    // 移除前缀并按小数点分割
    const parts1 = v1.toLowerCase().replace('beta', '').split('.').map(Number);
    const parts2 = v2.toLowerCase().replace('beta', '').split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    return 0;
}

/**
 * 获取版本文件内容
 * @param {string} url - 文件的 URL
 * @param {string} errorMessage - 失败时的错误信息
 * @param {object} [options={}] - Fetch选项
 * @returns {Promise<string>} 文件内容的Promise
 */
async function fetchVersion(url, errorMessage, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(errorMessage);
    }
    return await response.text();
}

/**
 * 检查版本更新的函数
 * @returns {Promise<{current: string, latest: string, hasUpdate: boolean, currentFormatted: string, latestFormatted: string}>} 版本信息对象
 */
async function checkForUpdates() {
    try {
        // 获取当前版本 (从本地的 VERSION.txt)
        const currentVersion = await fetchVersion('/VERSION.txt', '获取当前版本失败', {
            cache: 'no-store'
        });
        
        // 获取最新版本 (从用户指定的 GitHub 仓库)
        let latestVersion;
        const VERSION_URL = {
            // 代理URL
            PROXY: 'https://ghfast.top/raw.githubusercontent.com/BTYcloud/LTV/main/NEWversion.txt',
            // 直接URL
            DIRECT: 'https://raw.githubusercontent.com/BTYcloud/LTV/main/NEWversion.txt'
        };
        const FETCH_TIMEOUT = 1500;
        
        try {
            const proxyPromise = fetchVersion(VERSION_URL.PROXY, '代理请求失败');
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('代理请求超时')), FETCH_TIMEOUT)
            );
            
            latestVersion = await Promise.race([proxyPromise, timeoutPromise]);
            console.log('通过代理服务器获取版本成功');
        } catch (error) {
            console.log('代理请求失败，尝试直接请求:', error.message);
            try {
                latestVersion = await fetchVersion(VERSION_URL.DIRECT, '获取最新版本失败');
                console.log('直接请求获取版本成功');
            } catch (directError) {
                console.error('所有版本检查请求均失败:', directError);
                throw new Error('无法获取最新版本信息');
            }
        }
        
        console.log('当前版本:', currentVersion);
        console.log('最新版本:', latestVersion);
        
        // 清理版本字符串（移除可能的空格或换行符）
        const cleanCurrentVersion = currentVersion.trim();
        const cleanLatestVersion = latestVersion.trim();
        
        const hasUpdate = compareVersions(cleanLatestVersion, cleanCurrentVersion) > 0;
        
        return {
            current: cleanCurrentVersion,
            latest: cleanLatestVersion,
            hasUpdate: hasUpdate,
            currentFormatted: formatVersion(cleanCurrentVersion),
            latestFormatted: formatVersion(cleanLatestVersion)
        };
    } catch (error) {
        console.error('版本检测出错:', error);
        throw error;
    }
}

/**
 * 创建错误版本信息元素
 * @param {string} errorMessage - 错误信息
 * @returns {HTMLParagraphElement} 错误元素
 */
function createErrorVersionElement(errorMessage) {
    const errorElement = document.createElement('p');
    errorElement.className = 'text-gray-500 text-sm mt-1 text-center md:text-left';
    errorElement.innerHTML = `版本: <span class="text-amber-500">检测失败</span>`;
    errorElement.title = errorMessage;
    return errorElement;
}

/**
 * 在页脚显示版本信息的辅助函数
 * @param {HTMLElement} element - 要显示的元素
 */
function displayVersionElement(element) {
    const footerElement = document.querySelector('.footer p.text-gray-500.text-sm');
    if (footerElement) {
        footerElement.insertAdjacentElement('afterend', element);
    } else {
        const footer = document.querySelector('.footer .container');
        if (footer) {
            footer.querySelector('div').appendChild(element);
        }
    }
}

/**
 * 添加版本信息到页脚
 */
function addVersionInfoToFooter() {
    checkForUpdates().then(result => {
        if (!result) {
            const versionElement = createErrorVersionElement();
            displayVersionElement(versionElement);
            return;
        }
        
        const versionElement = document.createElement('p');
        versionElement.className = 'text-gray-500 text-sm mt-1 text-center md:text-left';
        
        if (result.hasUpdate) {
            versionElement.innerHTML = `版本: ${result.currentFormatted} <span class="inline-flex items-center bg-red-600 text-white text-xs px-2 py-0.5 rounded-md ml-1 cursor-pointer animate-pulse font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                发现新版
            </span>`;
            
            setTimeout(() => {
                const updateBtn = versionElement.querySelector('span');
                if (updateBtn) {
                    updateBtn.addEventListener('click', () => {
                        window.open('https://github.com/BTYcloud/LTV', '_blank');
                    });
                }
            }, 100);
        } else {
            versionElement.innerHTML = `版本: ${result.currentFormatted} <span class="text-green-500">(最新版本)</span>`;
        }
        
        displayVersionElement(versionElement);
    }).catch(error => {
        console.error('版本检测出错:', error);
        const errorElement = createErrorVersionElement(`错误信息: ${error.message}`);
        displayVersionElement(errorElement);
    });
}

// 页面加载完成后添加版本信息
document.addEventListener('DOMContentLoaded', addVersionInfoToFooter);
