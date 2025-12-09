// Helper function to safely extract error message from API responses
export const getErrorMessage = (error, defaultMessage = 'خطا در عملیات') => {
  console.error('Error:', error);
  
  // If there's a response from server
  if (error.response?.data) {
    const errorData = error.response.data;
    
    // If detail is a string
    if (typeof errorData.detail === 'string') {
      return errorData.detail;
    }
    
    // If detail is an array (validation errors from FastAPI)
    if (Array.isArray(errorData.detail)) {
      return errorData.detail
        .map(e => {
          if (typeof e === 'string') return e;
          if (e.msg) return e.msg;
          if (e.message) return e.message;
          return JSON.stringify(e);
        })
        .join(', ');
    }
    
    // If detail is an object
    if (typeof errorData.detail === 'object') {
      return JSON.stringify(errorData.detail);
    }
    
    // If there's a message field
    if (errorData.message) {
      return errorData.message;
    }
  }
  
  // If there's a message in error itself
  if (error.message && error.message !== 'Network Error') {
    return error.message;
  }
  
  // Default message
  return defaultMessage;
};
