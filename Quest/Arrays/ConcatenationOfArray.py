class Solution(object):
    def getConcatenation(self, nums):
        """
        Task: Concatenation of Array
        :type nums: List[int]
        :rtype: List[int]
        """
        n = len(nums)
        ans = [0] * (2 * n)

        for i in range(n):
            ans[i] = nums[i]
            ans[i + n] = nums[i]

        return ans

    """ 
    return nums + nums
    
    """

s = Solution()
nums = [1, 2, 1]
print(s.getConcatenation(nums))