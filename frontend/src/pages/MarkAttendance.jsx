import React, { useState, useRef } from 'react';
import api from '../api/axios';
import { Camera, User, Fingerprint, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MarkAttendance = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');
  const [faceImage, setFaceImage] = useState(null);
  const [idCardImage, setIdCardImage] = useState(null);
  
  const faceInputRef = useRef();
  const idInputRef = useRef();

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result.split(',')[1]); // Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sessionId) return alert('Session ID is required');
    if (!faceImage && !idCardImage) return alert('At least one biometric verification is required');

    setStatus('uploading');
    try {
      const response = await api.post('/attendance/mark', {
        student_id: user.student_id,
        session_id: parseInt(sessionId),
        face_image: faceImage,
        id_card_image: idCardImage,
        fingerprint_token: "dummy_token" // Integration with actual scanner would go here
      });

      if (response.data.status === 'verified') {
        setStatus('success');
        setMessage(`Attendance marked! Confidence: ${(response.data.overall_confidence * 100).toFixed(2)}%`);
      } else {
        setStatus('error');
        setMessage(`Verification failed: ${response.data.status}`);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'An error occurred');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Mark Attendance</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 font-medium mb-2">Session ID</label>
          <input
            type="number"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Enter active session ID"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 border-2 border-dashed rounded-lg flex flex-col items-center">
            <Camera className="w-12 h-12 text-blue-500 mb-2" />
            <span className="text-sm font-medium">Face Recognition</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={faceInputRef}
              onChange={(e) => handleFileChange(e, setFaceImage)}
            />
            <button
              type="button"
              onClick={() => faceInputRef.current.click()}
              className={`mt-2 px-4 py-1 rounded text-white ${faceImage ? 'bg-green-500' : 'bg-blue-500'}`}
            >
              {faceImage ? 'Captured' : 'Upload Image'}
            </button>
          </div>

          <div className="p-4 border-2 border-dashed rounded-lg flex flex-col items-center">
            <User className="w-12 h-12 text-blue-500 mb-2" />
            <span className="text-sm font-medium">ID Card Validation</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={idInputRef}
              onChange={(e) => handleFileChange(e, setIdCardImage)}
            />
            <button
              type="button"
              onClick={() => idInputRef.current.click()}
              className={`mt-2 px-4 py-1 rounded text-white ${idCardImage ? 'bg-green-500' : 'bg-blue-500'}`}
            >
              {idCardImage ? 'Captured' : 'Upload ID'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'uploading'}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-blue-300"
        >
          {status === 'uploading' ? 'Verifying...' : 'Verify & Mark Attendance'}
        </button>
      </form>

      {status === 'success' && (
        <div className="mt-6 p-4 bg-green-100 border-l-4 border-green-500 flex items-center">
          <CheckCircle className="text-green-500 mr-3" />
          <p className="text-green-700">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 flex items-center">
          <AlertCircle className="text-red-500 mr-3" />
          <p className="text-red-700">{message}</p>
        </div>
      )}
    </div>
  );
};

export default MarkAttendance;
