/**
 * Utility functions to convert theta values to student-friendly performance metrics
 */

export interface PerformanceLevel {
    level: 'Developing' | 'Proficient' | 'Advanced'
    color: string
    description: string
    numericValue: number // For radar chart (0-100 scale)
}

/**
 * Convert a theta value to a student-friendly performance level
 * 
 * Theta scale:
 * - θ < 0: Developing
 * - 0 ≤ θ < 1.5: Proficient
 * - θ ≥ 1.5: Advanced
 * 
 * @param theta - The theta value from IRT
 * @returns Performance level object with display properties
 */
export function thetaToPerformance(theta: number): PerformanceLevel {
    if (theta < 0) {
        return {
            level: 'Developing',
            color: '#FFA500', // Orange
            description: 'You are building foundational skills in this module. Keep practicing!',
            numericValue: normalizeTheta(theta, -3, 0, 0, 50)
        }
    } else if (theta < 1.5) {
        return {
            level: 'Proficient',
            color: '#4CAF50', // Green
            description: 'You have a solid understanding of this module. Great work!',
            numericValue: normalizeTheta(theta, 0, 1.5, 50, 80)
        }
    } else {
        return {
            level: 'Advanced',
            color: '#2196F3', // Blue
            description: 'You have mastered this module! Excellent performance!',
            numericValue: normalizeTheta(theta, 1.5, 3, 80, 100)
        }
    }
}

/**
 * Normalize theta value to a 0-100 scale for visualization
 * Maps theta range to a display range
 */
function normalizeTheta(
    theta: number,
    minTheta: number,
    maxTheta: number,
    minDisplay: number,
    maxDisplay: number
): number {
    // Clamp theta to the expected range
    const clampedTheta = Math.max(minTheta, Math.min(maxTheta, theta))
    
    // Linear interpolation
    const normalized = ((clampedTheta - minTheta) / (maxTheta - minTheta)) * (maxDisplay - minDisplay) + minDisplay
    
    return Math.round(normalized)
}

/**
 * Get a color for a performance value (0-100 scale)
 * Used for gradients in visualizations
 */
export function getPerformanceColor(value: number): string {
    if (value < 50) {
        return '#FFA500' // Orange - Developing
    } else if (value < 80) {
        return '#4CAF50' // Green - Proficient
    } else {
        return '#2196F3' // Blue - Advanced
    }
}

/**
 * Determine if a student should see resource recommendations
 * Based on performance plateau detection (future enhancement)
 */
export function shouldShowResources(theta: number): boolean {
    // For now, show resources for developing level
    // Future: implement plateau detection
    return theta < 0
}

/**
 * Format theta-based performance for display
 * Never shows raw theta values to students
 */
export function formatPerformanceDisplay(theta: number): string {
    const performance = thetaToPerformance(theta)
    return `${performance.level} (${performance.numericValue}%)`
}

