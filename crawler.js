const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const OUTPUT_FILE = 'weekly_issues.json';

async function loadExistingIssues() {
    try {
        const data = await fs.readFile(OUTPUT_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveIssues(issues) {
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(issues, null, 2), 'utf8');
    console.log(`保存成功: ${OUTPUT_FILE}`);
}

async function crawlWeeklyIssues() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--lang=zh-CN,zh'
        ]
    });

    try {
        const page = await browser.newPage();

        page.on('console', msg => console.log('页面日志:', msg.text()));

        await page.setViewport({
            width: 1920,
            height: 1080
        });

        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);

        const existingIssues = await loadExistingIssues();
        const existingTitles = new Set(existingIssues.map(issue => issue.title));

        console.log('正在访问页面...');
        await page.goto('https://github.com/ruanyf/weekly/issues', {
            waitUntil: ['networkidle0', 'domcontentloaded']
        });

        console.log('等待内容加载...');
        await page.waitForSelector('li[role="listitem"]');

        console.log('开始提取数据...');
        const newIssues = await page.evaluate(() => {
            const issues = [];
            const issueElements = document.querySelectorAll('li[role="listitem"]');

            console.log(`找到 ${issueElements.length} 个元素`);


            for (const issue of issueElements) {
                // 获取 aria-label 属性
                const title = issue.getAttribute('aria-label').split(": Status:")[0].trim();
                // 获取 issue 号
                const issueNumber = issue.querySelector('div[data-testid="list-row-repo-name-and-number"] span span').textContent.trim().replace(/#/g, "")

                const datetime = issue.querySelector('relative-time')?.getAttribute('datetime');

                const author = issue.querySelectorAll('a')[1].textContent;

                const regex = /自荐|推荐/;

                if (regex.test(title)) {

                    issues.push({
                        title,
                        issueNumber,
                        datetime,
                        author
                    });
                }
            }

            return issues;
        });

        console.log(`找到 ${newIssues.length} 个 issues`);

        // 过滤已存在的 issues
        const uniqueNewIssues = newIssues.filter(issue => !existingTitles.has(issue.title));
        console.log(`其中 ${uniqueNewIssues.length} 个是新的`);

        // 爬取新 issue 的内容
        for (const issue of uniqueNewIssues) {
            console.log(`正在爬取: ${issue.title}`);
            await page.goto('https://github.com/ruanyf/weekly/issues/' + issue.issueNumber, {
                waitUntil: 'networkidle0'
            });

            await page.waitForSelector('div[data-testid="issue-viewer-issue-container"]');

            const content = await page.evaluate(() => {
                const container = document.querySelectorAll('div[data-testid="issue-viewer-issue-container"]')[0];
                const markdown = container.querySelector('.markdown-body');
                return { content: markdown ? markdown.textContent.trim() : '', html: markdown.outerHTML }
            });

            issue.content = content.content;
            issue.html = content.html;

            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 合并新旧数据并保存
        const allIssues = [...existingIssues, ...uniqueNewIssues];
        await saveIssues(allIssues);

        return uniqueNewIssues;
    } finally {
        await browser.close();
    }
}

async function main() {
    try {
        const newIssues = await crawlWeeklyIssues();

        console.log(`新增 ${newIssues.length} 条数据`);
        for (const issue of newIssues) {
            console.log(`标题: ${issue.title}`);
            console.log(`作者: ${issue.author}`);
            console.log(`时间: ${issue.datetime}`);
            console.log(`Issue号: ${issue.issueNumber}`);
            console.log(`内容: ${issue.content.substring(0, 200)}...`);
            console.log('---');
        }
    } catch (error) {
        console.error('爬取失败:', error);
    }
}

main(); 