// ==UserScript==
// @name         CF Difficulty
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  在Codeforces状态页面显示题目难度
// @author       wangyizhi571247
// @match        https://codeforces.com/problemset/status*
// @match        https://codeforces.com/submissions/*
// @match        https://codeforces.com/problemset/submission/*
// @match        https://codeforces.com/contest/*/submission/*
// @match        https://codeforces.com/contest/*/status*
// @match        https://codeforces.com/contest/*/my*
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

    function getProblemId(problemUrl)
    {
        const SplitRes=problemUrl.split('/');
        var problemId;
        if(SplitRes.at(-2)=="problem") problemId=SplitRes.at(-3)+SplitRes.at(-1);
        else problemId=SplitRes.at(-2)+SplitRes.at(-1);
        return problemId;
    }

	// 获取并显示难度
	function showProblemDifficulty(problemId,difficultyElement)
	{
        fetchProblemDifficulty(problemId, function(difficulty) {
            console.log(problemId+" "+difficulty);
            if (difficulty > 0) {
                difficultyElement.textContent = difficulty;
                difficultyElement.style.color = getColorForDifficulty(difficulty);
            } else {
                difficultyElement.textContent = "NaN";
                difficultyElement.style.color = "#666666";
            }
        });
	}

	// 新建难度元素
	function newDifficultyElement()
	{
		const difficultyElement = document.createElement("span");
        difficultyElement.className = "problem-difficulty";
        difficultyElement.style.marginLeft = "0px";
        difficultyElement.style.padding = "2px 4px";
        difficultyElement.style.borderRadius = "0px";
        difficultyElement.style.fontSize = "10px";
        difficultyElement.style.fontWeight = "bold";
		return difficultyElement;
	}

    // 用于提交记录详细信息页面
    function processSubmission()
    {
        const submission=document.querySelector("div.datatable");
		const problemNameElements=submission.querySelectorAll("a[href]");
        for(let _pos=0,_len=problemNameElements.length;_pos<_len;_pos++)
        {
			let problemNameElement=problemNameElements[_pos];
            const problemUrl=problemNameElement.getAttribute("href");

			// console.log(problemUrl);
			if(!String(problemUrl).includes("/problem/")) continue;

            const probleId=getProblemId(problemUrl);
            const difficultyElement=newDifficultyElement();
            problemNameElement.parentNode.insertBefore(difficultyElement,problemNameElement.nextSibling);
            showProblemDifficulty(probleId,difficultyElement);
        }
    }

    // 新建链接元素
	function newLinkerElement(text,url)
	{
		const linkerElement = document.createElement("a");
        linkerElement.style.marginLeft = "0px";
        linkerElement.style.padding = "2px 4px";
        linkerElement.style.borderRadius = "2px";
        linkerElement.style.fontSize = "10px";
        linkerElement.text=text,linkerElement.href=url;
		return linkerElement;
	}

    function getUserId(url)
    {
        const splitRes=url.split('/');
        return splitRes.at(-1);
    }

    // 在用户名边上显示所有提交的链接
    function processUserName()
    {
        const submission=document.querySelector("div.datatable");
		const userNameElements=submission.querySelectorAll("a[href]");
        for(let _pos=0,_len=userNameElements.length;_pos<_len;_pos++)
        {
			let userNameElement=userNameElements[_pos];
            const userUrl=userNameElement.getAttribute("href");

			console.log(userUrl);
			if(!String(userUrl).includes("/profile/")) continue;

            const userId=getUserId(userUrl);
            const userSubmissionUrl="/submissions/"+userId;
            // console.log(userSubmissionUrl);
            const linkerElement=newLinkerElement("💊",userSubmissionUrl);
            userNameElement.parentNode.insertBefore(linkerElement,userNameElement.nextSibling);
        }
    }

    // 在提交记录边上显示链接
    function processSubmissionLink()
    {
        const submission=document.querySelector("div.datatable");
		const submissionElements=submission.querySelectorAll("a[href]");
        for(let _pos=0,_len=submissionElements.length;_pos<_len;_pos++)
        {
			let submissionElement=submissionElements[_pos];
            const submissionUrl=submissionElement.getAttribute("href");

			console.log(submissionUrl);
			if(!String(submissionUrl).includes("/submission/")) continue;

            const linkerElement=newLinkerElement("💊",submissionUrl);
            submissionElement.parentNode.insertBefore(linkerElement,submissionElement.nextSibling);
        }
    }

    // 页面加载完成后初始化
    function init() {
        processSubmission();
        processUserName();
        processSubmissionLink();
    }

    // 等待页面加载完成后执行
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();