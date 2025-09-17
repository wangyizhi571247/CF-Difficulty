// ==UserScript==
// @name         CF Difficulty
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在Codeforces状态页面显示题目难度
// @author       wangyizhi571247
// @match        https://codeforces.com/problemset/status*
// @match        http://codeforces.com/problemset/status*
// @match        https://codeforces.com/contest/*/status*
// @match        http://codeforces.com/contest/*/status*
// @match        https://codeforces.com/contest/*/my*
// @match        http://codeforces.com/contest/*/my*
// @match        https://codeforces.com/submissions/*
// @match        http://codeforces.com/submissions/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      codeforces.com
// ==/UserScript==

// deepseek 写的
// 但是寄了
// 然后 wyz 自己花了 30min 修好了/kk

(function() {
    'use strict';

    // 难度颜色映射（基于Codeforces官方颜色方案）
    const difficultyColors = {
        800: "#cccccc", // 灰色
        1000: "#77ff77", // 绿色
        1200: "#77ddbb", // 青色
        1400: "#aaaaff", // 蓝色
        1600: "#ccccff", // 紫色
        1900: "#ff88ff", // 粉色
        2100: "#ffcc88", // 橙色
        2400: "#ff7777", // 红色
        3000: "#ff3333" // 深红色
    };

    // 获取难度对应的颜色
    function getColorForDifficulty(difficulty) {
        if (!difficulty) return "#000000";

        const thresholds = Object.keys(difficultyColors).map(Number).sort((a, b) => a - b);
        for (const threshold of thresholds) {
            if (difficulty <= threshold) {
                return difficultyColors[threshold];
            }
        }
        return difficultyColors[3000];
    }

    // 从缓存中获取题目难度
    function getCachedDifficulty(problemId) {
        const cache = GM_getValue("cfDifficultyCache", {});
        return cache[problemId] || null;
    }

    // 缓存题目难度
    function cacheDifficulty(problemId, difficulty) {
        const cache = GM_getValue("cfDifficultyCache", {});
        cache[problemId] = difficulty;
        GM_setValue("cfDifficultyCache", cache);
    }

    // 获取题目难度
    function fetchProblemDifficulty(problemId, callback) {
        // 首先检查缓存
        //console.log(problemId);
        const cachedDifficulty = getCachedDifficulty(problemId);
        if (cachedDifficulty !== null) {
            callback(cachedDifficulty);
            return;
        }

        // 从API获取数据
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://codeforces.com/api/problemset.problems`,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    if (data.status === "OK") {
                        const problems = data.result.problems;
                        for (const problem of problems) {
                            const currentId = `${problem.contestId}${problem.index}`;
                            if (currentId === problemId && problem.rating) {
                                cacheDifficulty(problemId, problem.rating);
                                callback(problem.rating);
                                return;
                            }
                        }
                    }
                    // 如果没有找到难度，缓存为0
                    cacheDifficulty(problemId, 0);
                    callback(0);
                } catch (e) {
                    console.error("Error parsing problem difficulty:", e);
                    callback(0);
                }
            },
            onerror: function() {
                console.error("Failed to fetch problem difficulty");
                callback(0);
            }
        });
    }

    // 处理单个提交记录
    function processSubmission(submission) {

        const problemCell = submission.querySelector("td[data-problemId]");
        if (!problemCell) return;

        // 检查是否已经处理过
        if (problemCell.querySelector(".problem-difficulty")) return;

        const problemLink = problemCell.querySelector("a[href]").getAttribute("href");
        const problemLinkSplitRes=problemLink.split('/');
        var problemId;
        if(problemLinkSplitRes.at(-2)=="problem") problemId=problemLinkSplitRes.at(-3)+problemLinkSplitRes.at(-1);
        else problemId=problemLinkSplitRes.at(-2)+problemLinkSplitRes.at(-1);

        // console.log(problemId);
        if (!problemId) return;

        // 获取题目名称元素
        const problemNameElement = problemCell.querySelector("a");
        if (!problemNameElement) return;

        // 创建难度显示元素
        const difficultyElement = document.createElement("span");
        difficultyElement.className = "problem-difficulty";
        difficultyElement.style.marginLeft = "8px";
        difficultyElement.style.padding = "2px 6px";
        difficultyElement.style.borderRadius = "4px";
        difficultyElement.style.fontSize = "12px";
        difficultyElement.style.fontWeight = "bold";

        // 插入到题号后面
        problemNameElement.parentNode.insertBefore(difficultyElement, problemNameElement.nextSibling);

        // 获取并显示难度
        fetchProblemDifficulty(problemId, function(difficulty) {
            if (difficulty > 0) {
                difficultyElement.textContent = difficulty;
                difficultyElement.style.color = getColorForDifficulty(difficulty);
            } else {
                difficultyElement.textContent = "NaN";
                difficultyElement.style.color = "#666666";
            }
        });
    }

    // 处理所有提交记录
    function processAllSubmissions() {
        const submissions = document.querySelectorAll("table.status-frame-datatable tr:not(:first-child)");
        submissions.forEach(processSubmission);
    }

    // 页面加载完成后初始化
    function init() {
        // 处理现有提交
        processAllSubmissions();
    }

    // 等待页面加载完成后执行
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();