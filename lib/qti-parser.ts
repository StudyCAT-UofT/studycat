import { Readable } from "stream";
import * as cheerio from "cheerio";
import sax from "sax";

export type QuestionObj = {
    moduleTitle: string | null;
    questionId: string | null;
    questionTitle: string | null;
    questionImgUrl: string | null;
    questionImgAlt: string | null;
    correctAnsIds: string[];
    correctAnsLetters: string[];
    answerOptions: Record<string, AnswerOption>;
};

export type AnswerOption = {
    answerId: string;
    answerText: string;
    answerLetter: string;
    points: number | null;
    justification: string | null;
};

export type ItemBankObj = {
    itemBankId: string;
    requiredItemIds: string[];
};

export function parseQtiBuffer(buffer: Buffer, itemBankObj: ItemBankObj | null): Promise<{ questions: QuestionObj[], itemBanks: ItemBankObj[] }> {
    return new Promise((resolve, reject) => {
        const emptyQuestion = (): QuestionObj => ({
            moduleTitle: null,
            questionId: null,
            questionTitle: null,
            questionImgUrl: null,
            questionImgAlt: null,
            correctAnsIds: [],
            correctAnsLetters: [],
            answerOptions: {},
        });

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        const tagStack: string[] = []; // Keeps track of the current position in the XML hierarchy to help with context when parsing certain nodes
        const parsedQuestions: QuestionObj[] = [];

        const itemBanksToParse: any[] = [];

        let currentModuleName = '';
        let currentQuestionObj = emptyQuestion();
        let optionIndex = 0;
        let truncated = false;

        let tempAnsId = '';
        let tempAnsText = '';
        let tempResProcessingId = '';
        let inRespCondition = false;
        let tempFeedbackId = '';
        let inItemBankTitle = false;

        const strict = true; 

        const saxStream = sax.createStream(strict);

        saxStream.on("error", function (this: sax.SAXStream, e: Error) {
            const problemId = currentQuestionObj.questionId || "Unknown ID";
    
            console.warn(`[XML Parser Warning] Issue found near Question ID: ${problemId}`);
            console.warn(`Details: ${e.message}`);
            
            reject(new Error(`Malformed XML near Question ID: ${problemId}. ${e.message}`));
        });

        saxStream.on('opentag', function (node) {
            tagStack.push(node.name);

            if (!itemBankObj && node.name === "assessment") {
                currentModuleName = getAttr(node, "title"); // Note: currently all questions in a quiz are assumed to be in the same module under the quiz title name, although this may change in the future if we start supporting quizzes with multiple modules
            } else if (node.name === "item") {
                if (itemBankObj && !itemBankObj.requiredItemIds.includes(getAttr(node, "ident"))) {
                    truncated = true;
                } else {
                    currentQuestionObj.moduleTitle = currentModuleName;
                    currentQuestionObj.questionId = getAttr(node, "ident");                    
                    truncated = false;
                }
            } else if (node.name === "response_label" && !truncated) { // if truncated, we skip processing remaining options for the question - follows the specification outlined in UPLOAD_FORMAT.md
                tempAnsId = getAttr(node, "ident");
                tempAnsText = '';
            } else if (node.name === "respcondition") {
                inRespCondition = true;
                tempResProcessingId = '';
            } else if (node.name === "itemfeedback") {
                tempFeedbackId = getAttr(node, "ident");
            } else if (node.name === "bankentry_item") {
                const bankId = getAttr(node, "sourcebank_ref");
                const itemId = getAttr(node, "item_ref");

                const existingBank = itemBanksToParse.find(b => b.itemBankId === bankId);
                
                if (existingBank) {
                    if (!existingBank.requiredItemIds.includes(itemId)) {
                        existingBank.requiredItemIds.push(itemId);
                    }
                } else {
                    itemBanksToParse.push({ itemBankId: bankId, requiredItemIds: [itemId] });
                }
            }
        });

        saxStream.on('text', function (node) {
            const t = node.trim();

            if (!t) return;

            const inPresentation = tagStack.includes("presentation");
            const inResponseLabel = tagStack.includes("response_label");
            const inItemFeedback = tagStack.includes("itemfeedback");

            const parent = tagStack[tagStack.length - 1];

            if (parent === "mattext") {
                if (inResponseLabel) { // text of an answer option
                    tempAnsText = extractText(t);
                } else if (inPresentation) { // text is question stem
                    currentQuestionObj.questionTitle = extractText(t);
                    currentQuestionObj.questionImgUrl = extractImageSources(t)[0] ?? null;
                    currentQuestionObj.questionImgAlt = extractImageSources(t)[1] ?? null;
                } else if (inItemFeedback) {
                    const ansId = tempFeedbackId.replace('_fb', '');

                    const match = Object.keys(currentQuestionObj.answerOptions)
                        .find(key => currentQuestionObj.answerOptions[key].answerId === ansId);

                    if (match) {
                        currentQuestionObj.answerOptions[match].justification = extractText(t);
                    }
                };
            }

            if (parent === "varequal" && inRespCondition) {
                tempResProcessingId = t;
            }

            if (parent === "setvar" && inRespCondition) {
                const match = Object.keys(currentQuestionObj.answerOptions)
                    .find(key => currentQuestionObj.answerOptions[key].answerId === tempResProcessingId);

                if (match) {
                    currentQuestionObj.answerOptions[match].points = Number(t);
                }
            }
            
            if (parent === "sourcebank_ref" && !itemBanksToParse.some(bank => bank.itemBankId === t)) {
                itemBanksToParse.push({itemBankId: t, itemId: ''});
            }

            if (parent === "fieldlabel" && t === "bank_title" && itemBankObj) {
                inItemBankTitle = true;
            } else if (parent === "fieldentry" && inItemBankTitle && itemBankObj) {
                currentModuleName = t;
                inItemBankTitle = false;
            }
        })

        saxStream.on('closetag', function (tagName) {
            tagStack.pop();

            if (tagName === "item") { // end of a question
                parsedQuestions.push(currentQuestionObj);

                optionIndex = 0;
                currentQuestionObj = emptyQuestion();
                truncated = false;

            } else if (tagName === "response_label" && !truncated) {
                if (!tempAnsText || tempAnsText.trim() === '') {
                    console.warn(`Warning: Question ${currentQuestionObj.questionId ?? "Unknown Id"} has a missing/blank answer option at position ${optionIndex + 1}. Truncating remaining options.`);
                    truncated = true;
                } else {
                    let key = `answer_${alphabet[optionIndex].toLowerCase()}`;

                    currentQuestionObj.answerOptions[key] = {
                        answerId: tempAnsId,
                        answerText: tempAnsText,
                        answerLetter: alphabet[optionIndex],
                        points: null,
                        justification: null
                    }
                    optionIndex++;
                }
                tempAnsText = '';
                tempAnsId = '';
            } else if (tagName === "respcondition") {
                inRespCondition = false;
            }
        })

        saxStream.on('end', function () {
            resolve({
                questions: parsedQuestions,
                itemBanks: itemBanksToParse
            });
        });

        Readable.from(buffer).pipe(saxStream); // pipe buffer into sax stream
    });
}

export function formatQuestions(rawQuestions: QuestionObj[]): QuestionObj[] {
    const finalizedQuestions: QuestionObj[] = [];

    rawQuestions.forEach(q => { 

        const points = Object.values(q.answerOptions)
            .map(option => option.points)
            .filter((p): p is number => p != null);

        const maxPoints = Math.max(...points);

        q.correctAnsIds = Object.values(q.answerOptions)
            .filter(opt => opt.points === maxPoints && maxPoints > 0)
            .map(opt => opt.answerId);

        q.correctAnsIds.forEach(ansId => {
            const match = Object.values(q.answerOptions)
                .find(opt => opt.answerId === ansId);
            if (match) {
                q.correctAnsLetters.push(match.answerLetter);
            }
        });
        finalizedQuestions.push(q);
    });

    return finalizedQuestions;
}

function getAttr(node: sax.Tag | sax.QualifiedTag, key: string): string {
    const attrs = node.attributes as Record<string, string>;
    return attrs[key] ?? "";
}

function extractText(htmlContent: string) {
    const $ = cheerio.load(htmlContent);
    return $.text();
}

function extractImageSources(htmlContent: string) {
    const $ = cheerio.load(htmlContent);
    const imgElement = $('img');
    const src = imgElement.attr('src') ? imgElement.attr('src') : null;
    const alt = imgElement.attr('alt') ? imgElement.attr('alt') : null;
    return [src, alt];
}