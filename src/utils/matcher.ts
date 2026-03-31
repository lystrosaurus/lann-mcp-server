import type { MatchResult } from '../types/index.js';

/**
 * 计算两个字符串的相似度（基于编辑距离）
 * @param str1 字符串 1
 * @param str2 字符串 2
 * @returns 相似度 (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // 使用 Levenshtein 距离算法
  const matrix: number[][] = [];

  // 初始化矩阵
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  // 填充矩阵
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const maxLen = Math.max(s1.length, s2.length);
  const distance = matrix[s2.length][s1.length];
  return 1 - distance / maxLen;
}

/**
 * 智能匹配函数
 * 匹配优先级：
 * 1. 精确匹配（完全相等）
 * 2. 包含匹配（输入是候选项的子串，或候选项是输入的子串）
 * 3. 相似度匹配（当以上都失败时，提供建议）
 * 
 * @param input 用户输入
 * @param candidates 候选项列表
 * @returns 匹配结果
 */
export function smartMatch(input: string, candidates: string[]): MatchResult {
  if (!input || input.trim().length === 0) {
    return { matched: false, confidence: 'none' };
  }

  // 移除空格并转小写
  const normalizedInput = input.trim().toLowerCase().replace(/\s+/g, '');

  // 1. 精确匹配
  const exactMatch = candidates.find(
    c => c.toLowerCase().replace(/\s+/g, '') === normalizedInput
  );
  if (exactMatch) {
    return {
      matched: true,
      exactMatch,
      confidence: 'high'
    };
  }

  // 2. 包含匹配（双向：输入是候选项的子串，或候选项是输入的子串）
  const containsMatches = candidates.filter(c => {
    const normalizedCandidate = c.toLowerCase().replace(/\s+/g, '');
    // 移除常见字符差异后再比较（如"按摩"vs"按"）
    const simplifiedInput = normalizedInput.replace(/按摩/g, '按');
    const simplifiedCandidate = normalizedCandidate.replace(/按摩/g, '按');
    
    return normalizedCandidate.includes(normalizedInput) ||
           normalizedInput.includes(normalizedCandidate) ||
           simplifiedCandidate.includes(simplifiedInput) ||
           simplifiedInput.includes(simplifiedCandidate);
  });

  if (containsMatches.length > 0) {
    // 按长度排序，优先返回较短的匹配（更精确）
    containsMatches.sort((a, b) => a.length - b.length);
    
    // 如果只有一个匹配且是完全包含关系，认为是高置信度
    if (containsMatches.length === 1 && 
        containsMatches[0].toLowerCase() === normalizedInput) {
      return {
        matched: true,
        exactMatch: containsMatches[0],
        confidence: 'high'
      };
    }

    return {
      matched: true,
      exactMatch: containsMatches[0],
      suggestions: containsMatches.slice(0, 5), // 最多返回 5 个建议
      confidence: containsMatches.length === 1 ? 'high' : 'medium'
    };
  }

  // 3. 相似度匹配
  const similarityThreshold = 0.6;
  const similarMatches = candidates
    .map(candidate => ({
      candidate,
      similarity: calculateSimilarity(normalizedInput, candidate.toLowerCase())
    }))
    .filter(item => item.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity);

  if (similarMatches.length > 0) {
    const bestMatch = similarMatches[0];
    const confidence: 'medium' | 'low' = bestMatch.similarity >= 0.8 ? 'medium' : 'low';
    
    return {
      matched: false,
      suggestions: similarMatches.slice(0, 5).map(m => m.candidate),
      confidence
    };
  }

  // 无匹配
  return {
    matched: false,
    confidence: 'none'
  };
}

/**
 * 获取匹配描述信息
 * @param result 匹配结果
 * @param inputType 输入类型（用于错误提示）
 * @returns 描述信息
 */
export function getMatchMessage(result: MatchResult, inputType: string): string {
  if (result.matched) {
    if (result.confidence === 'high' && !result.suggestions) {
      return `已匹配到${inputType}：${result.exactMatch}`;
    }
    return `已匹配到${inputType}：${result.exactMatch}`;
  }

  if (result.suggestions && result.suggestions.length > 0) {
    const suggestionList = result.suggestions.slice(0, 3).join('、');
    return `未找到匹配的${inputType}，您可能想要：${suggestionList}`;
  }

  return `未找到匹配的${inputType}，请检查输入是否正确`;
}
