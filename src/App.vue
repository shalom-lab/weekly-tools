<template>
    <div class="container">
        <!-- 顶部导航栏 -->
        <nav class="nav-bar">
            <div class="title-section">
                <h1 class="site-title">Weekly Tools</h1>
                <div class="repo-links">
                    <a href="https://github.com/ruanyf/weekly/issues" target="_blank" class="repo-link">
                        <span class="repo-icon">📚</span>
                        @ruanyf/weekly/issues
                    </a>
                    <span class="divider">•</span>
                    <a href="https://github.com/shalom-lab/weekly-tools" target="_blank" class="repo-link">
                        <span class="repo-icon">📦</span>
                        shalom-lab/weekly-tools
                    </a>
                </div>
            </div>
            <div class="search-bar">
                <input type="text" v-model="searchQuery" placeholder="搜索标题或内容..." class="search-input">
            </div>
        </nav>

        <div class="main-content">
            <!-- 左侧列表 -->
            <div class="issue-list">
                <div class="list-content">
                    <div v-for="issue in paginatedIssues" :key="issue.issueNumber" class="issue-item"
                        :class="{ active: selectedIssue?.issueNumber === issue.issueNumber }"
                        @click="selectIssue(issue)">
                        <h3 class="issue-title">{{ issue.title }}</h3>
                        <div class="issue-meta">
                            <a :href="'https://github.com/' + issue.author" target="_blank" class="author-link">
                                <span class="author-icon">👤</span>
                                {{ issue.author }}
                            </a>
                            <span class="issue-date">
                                <span class="date-icon">📅</span>
                                {{ formatDate(issue.datetime) }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 分页控件 -->
                <div class="pagination">
                    <button @click="currentPage--" :disabled="currentPage === 1" class="page-btn">
                        上一页
                    </button>
                    <span class="page-info">
                        {{ currentPage }} / {{ totalPages }}
                    </span>
                    <button @click="currentPage++" :disabled="currentPage === totalPages" class="page-btn">
                        下一页
                    </button>
                </div>
            </div>

            <!-- 右侧详情 -->
            <div class="issue-detail" v-if="selectedIssue">
                <div class="detail-header">
                    <div class="detail-title">
                        <h2>{{ selectedIssue.title }}</h2>
                        <a :href="`https://github.com/ruanyf/weekly/issues/${selectedIssue.issueNumber}`"
                            target="_blank" class="original-link">
                            #{{ selectedIssue.issueNumber }}
                        </a>
                    </div>
                    <div class="detail-meta">
                        <span class="issue-date">
                            <span class="date-icon">📅</span>
                            {{ formatDate(selectedIssue.datetime) }}
                        </span>
                        <a :href="'https://github.com/' + selectedIssue.author" target="_blank" class="author-link">
                            <span class="author-icon">👤</span>
                            {{ selectedIssue.author }}
                        </a>
                    </div>
                </div>
                <div class="detail-content markdown-body" v-html="selectedIssue.html"></div>
            </div>
            <div class="empty-state" v-else>
                <div class="empty-content">
                    <span class="empty-icon">📝</span>
                    <p>选择一篇文章开始阅读</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import issues from '../weekly_issues.json'

const searchQuery = ref('')
const selectedIssue = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)

// 计算每页显示数量
const calculatePageSize = () => {
    // 列表项高度: padding(16px * 2) + 标题行高(24px) + meta行高(21px) + border(1px) = 78px
    const itemHeight = 75
    // 计算可用高度: 窗口高度 - 导航栏(64px) - 分页控件(64px) - 上下padding(32px)
    const availableHeight = window.innerHeight - 160 // 增加一些余量
    // 计算可显示的数量
    const calculatedSize = Math.floor(availableHeight / itemHeight) - 1 // 减1确保有足够空间
    pageSize.value = Math.max(5, calculatedSize) // 最少显示5条
    // 重置到第一页，避免页码超出范围
    currentPage.value = 1
}

// 监听窗口大小变化
const handleResize = () => {
    calculatePageSize()
}

// 组件挂载时初始化
onMounted(() => {
    calculatePageSize()
    window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
})

// 按时间降序排序并过滤
const filteredIssues = computed(() => {
    return issues
        .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
        .filter(issue => {
            const query = searchQuery.value.toLowerCase()
            return issue.title.toLowerCase().includes(query) ||
                issue.content.toLowerCase().includes(query)
        })
})

// 分页
const totalPages = computed(() =>
    Math.ceil(filteredIssues.value.length / pageSize.value)
)

const paginatedIssues = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredIssues.value.slice(start, start + pageSize.value)
})

// 监听搜索，重置页码
watch(searchQuery, () => {
    currentPage.value = 1
})

const selectIssue = (issue) => {
    selectedIssue.value = issue
}

const formatDate = (datetime) => {
    return new Date(datetime).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}
</script>

<style>
/* 全局样式 */
:root {
    --primary-color: #2196f3;
    --text-color: #333;
    --border-color: #e0e0e0;
    --hover-color: #f5f5f5;
    --active-color: #e3f2fd;
}

body {
    margin: 0;
    height: 100vh;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
        Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: var(--text-color);
}

#app {
    height: 100%;
}

.container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

/* 导航栏 */
.nav-bar {
    z-index: 100;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
}

.title-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 2rem;
}

.site-title {
    margin: 0;
    font-size: 1.5rem;
    color: var(--primary-color);
}

.repo-links {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.875rem;
    color: #666;
}

.repo-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: inherit;
    text-decoration: none;
    transition: color 0.2s;
}

.repo-link:hover {
    color: var(--primary-color);
}

.repo-icon {
    font-size: 1rem;
}

.divider {
    color: #ccc;
}

.search-bar {
    flex: 1;
    max-width: 600px;
}

.search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    transition: all 0.2s;
}

.search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

/* 容器布局 */
.main-content {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(500px, 3fr) 6fr;
    gap: 2rem;
    padding: 1rem 2rem;
}

/* 列表样式 */
.issue-list {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
    padding-right: 1rem;
    min-width: 0;
    height: 100%;
    overflow: hidden;
}

.issue-item {
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 8px;
    overflow: hidden;
    box-sizing: border-box;
    height: 78px;
    /* 固定高度 */
}

.issue-item:hover {
    background-color: var(--hover-color);
    transform: translateX(4px);
}

.issue-item.active {
    background-color: var(--active-color);
    border-left: 4px solid var(--primary-color);
}

.issue-title {
    margin: 0 0 10px 0;
    font-size: 16px;
    line-height: 24px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.issue-meta {
    font-size: 14px;
    line-height: 21px;
    color: #666;
    display: flex;
    justify-content: space-between;
    gap: 10px;
}

.author-link {
    flex-shrink: 0;
}

.issue-date {
    margin-left: auto;
    flex-shrink: 0;
    margin-right: 30px;
}

/* 分页控件 */
.pagination {
    flex-shrink: 0;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
}

.page-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
    background: var(--primary-color);
    color: white;
}

.page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 详情样式 */
.issue-detail {
    overflow-y: auto;
    padding: 0 2rem;
}

.detail-header {
    position: sticky;
    top: 0;
    background: white;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-color);
}

.detail-title {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.detail-title h2 {
    margin-left: -10px;
    margin-bottom: 5px;
    flex: 1;
}

.original-link {
    color: var(--primary-color);
    text-decoration: none;
    font-size: 0.875rem;
    transition: all 0.2s;
}

.original-link:hover {
    text-decoration: underline;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
}

.empty-content {
    text-align: center;
}

.empty-icon {
    font-size: 3rem;
}

/* 图标和元数据 */
.author-icon,
.date-icon {
    margin-right: 0.5rem;
}

/* 滚动条样式 */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #555;
}

/* Markdown 内容样式 */
.markdown-body {
    line-height: 1.6;
    font-size: 16px;
}

.markdown-body img {
    max-width: 100%;
    height: auto;
}

.markdown-body a {
    color: var(--primary-color);
    text-decoration: none;
}

.markdown-body a:hover {
    text-decoration: underline;
}

.markdown-body pre {
    background: #f6f8fa;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
}

/* 列表内容区域 */
.list-content {
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    min-height: 0;
}
</style>