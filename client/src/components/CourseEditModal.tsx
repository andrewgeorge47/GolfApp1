import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Target, Info, AlertCircle, CheckCircle, Pencil, X as XIcon } from 'lucide-react';
import { getCourseTeeboxData, updateCourseTeeboxData, updateCourseParValues, updateCourseHoleIndexes } from '../services/api';
import { useAuth } from '../AuthContext';

interface CourseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: number;
    name: string;
    location?: string;
    designer?: string;
    par_values?: number[];
    hole_indexes?: number[];
  } | null;
}

interface TeeboxData {
  teebox: string;
  course_rating: number;
  course_slope: number;
  usage_count: number;
  last_used: string;
}

const CourseEditModal: React.FC<CourseEditModalProps> = ({ isOpen, onClose, course }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'par' | 'teebox' | 'holeindex'>('par');
  const [parValues, setParValues] = useState<number[]>([]);
  const [holeIndexes, setHoleIndexes] = useState<number[]>([]);
  const [teeboxData, setTeeboxData] = useState<TeeboxData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [teeboxInputs, setTeeboxInputs] = useState<{[key: string]: {rating: string, slope: string}}>({});
  const [editingTeeboxes, setEditingTeeboxes] = useState<Set<string>>(new Set());
  const [unavailableTeeboxes, setUnavailableTeeboxes] = useState<Set<string>>(new Set());

  // Teebox order and color map
  const TEEBOX_ORDER = ['Black', 'Blue', 'White', 'Green', 'Yellow', 'Red', 'Junior', 'PAR3'];
  const TEEBOX_COLORS: { [key: string]: string } = {
    Black: 'bg-gray-800 text-white border-gray-700',
    Blue: 'bg-blue-200 text-blue-900 border-blue-300',
    White: 'bg-white text-gray-900 border-gray-300',
    Green: 'bg-green-200 text-green-900 border-green-300',
    Yellow: 'bg-yellow-200 text-yellow-900 border-yellow-300',
    Red: 'bg-red-200 text-red-900 border-red-300',
    Junior: 'bg-cyan-200 text-cyan-900 border-cyan-300',
    PAR3: 'bg-purple-200 text-purple-900 border-purple-300',
  };

  useEffect(() => {
    if (isOpen && course) {
      loadCourseData();
    }
  }, [isOpen, course]);

  const loadCourseData = async () => {
    if (!course) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load par values
      if (course.par_values) {
        setParValues([...course.par_values]);
      } else {
        // Default par values for 18 holes
        setParValues([4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4]);
      }

      // Load hole indexes
      if (course.hole_indexes) {
        setHoleIndexes([...course.hole_indexes]);
      } else {
        // Default hole indexes for 18 holes (1-18)
        setHoleIndexes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
      }

      // Load teebox data
      const teeboxResponse = await getCourseTeeboxData(course.id);
      const teeboxData = teeboxResponse.data.teeboxData || [];
      setTeeboxData(teeboxData);
      
      // Initialize teebox inputs with existing data
      const inputs: {[key: string]: {rating: string, slope: string}} = {};
      TEEBOX_ORDER.forEach(teebox => {
        const existing = teeboxData.find((t: TeeboxData) => t.teebox === teebox);
        inputs[teebox] = {
          rating: existing ? existing.course_rating.toString() : '',
          slope: existing ? existing.course_slope.toString() : ''
        };
      });
      setTeeboxInputs(inputs);
    } catch (err) {
      console.error('Error loading course data:', err);
      setError('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParValues = async () => {
    if (!course) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await updateCourseParValues(course.id, parValues);
      setSuccess('Par values updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving par values:', err);
      setError('Failed to save par values');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHoleIndexes = async () => {
    if (!course) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await updateCourseHoleIndexes(course.id, holeIndexes);
      setSuccess('Hole indexes updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving hole indexes:', err);
      setError('Failed to save hole indexes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTeeboxes = async () => {
    if (!course) return;
    
    // Validate inputs
    const teeboxesToSave = [];
    for (const [teebox, inputs] of Object.entries(teeboxInputs)) {
      if (inputs.rating && inputs.slope) {
        const rating = parseFloat(inputs.rating);
        const slope = parseFloat(inputs.slope);
        
        if (rating < 60 || rating > 80) {
          setError(`Course rating for ${teebox} must be between 60 and 80`);
          return;
        }
        
        if (slope < 55 || slope > 155) {
          setError(`Course slope for ${teebox} must be between 55 and 155`);
          return;
        }
        
        teeboxesToSave.push({ teebox, rating, slope });
      }
    }
    
    if (teeboxesToSave.length === 0) {
      setError('Please fill in at least one teebox with rating and slope');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save each teebox
      for (const { teebox, rating, slope } of teeboxesToSave) {
        await updateCourseTeeboxData(course.id, teebox, rating, slope);
      }
      
      // Reload teebox data
      const teeboxResponse = await getCourseTeeboxData(course.id);
      setTeeboxData(teeboxResponse.data.teeboxData || []);
      
      setSuccess(`Successfully saved ${teeboxesToSave.length} teebox${teeboxesToSave.length > 1 ? 'es' : ''}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving teeboxes:', err);
      setError('Failed to save teebox data');
    } finally {
      setSaving(false);
    }
  };

  const handleTeeboxInputChange = (teebox: string, field: 'rating' | 'slope', value: string) => {
    setTeeboxInputs(prev => ({
      ...prev,
      [teebox]: {
        ...prev[teebox],
        [field]: value
      }
    }));
  };

  const handleClearAllTeeboxes = () => {
    const confirmed = window.confirm('Are you sure you want to clear all teebox inputs?');
    if (confirmed) {
      setTeeboxInputs({});
      setUnavailableTeeboxes(new Set());
    }
  };

  const handleToggleUnavailable = (teeboxName: string) => {
    const isUnavailable = unavailableTeeboxes.has(teeboxName);
    if (isUnavailable) {
      // Mark as available - clear from unavailable set
      setUnavailableTeeboxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(teeboxName);
        return newSet;
      });
      // Clear any inputs for this teebox
      setTeeboxInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[teeboxName];
        return newInputs;
      });
    } else {
      // Mark as unavailable
      setUnavailableTeeboxes(prev => {
        const newSet = new Set(prev);
        newSet.add(teeboxName);
        return newSet;
      });
      // Clear any inputs for this teebox
      setTeeboxInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[teeboxName];
        return newInputs;
      });
    }
  };

  const getConfiguredTeeboxCount = () => {
    return Object.values(teeboxInputs).filter(input => input.rating && input.slope).length;
  };

  const getTeeboxStats = () => {
    let existingCount = 0;
    let newCount = 0;
    let modifiedCount = 0;
    let unavailableCount = 0;

    TEEBOX_ORDER.forEach(teebox => {
      const existing = teeboxData.find((t: TeeboxData) => t.teebox === teebox);
      const inputs = teeboxInputs[teebox] || { rating: '', slope: '' };
      const isUnavailable = unavailableTeeboxes.has(teebox);
      
      if (isUnavailable) {
        unavailableCount++;
      } else if (inputs.rating && inputs.slope) {
        if (existing) {
          if (inputs.rating !== existing.course_rating.toString() || 
              inputs.slope !== existing.course_slope.toString()) {
            modifiedCount++;
          } else {
            existingCount++;
          }
        } else {
          newCount++;
        }
      }
    });

    return { existingCount, newCount, modifiedCount, unavailableCount };
  };

  const getEditingStats = () => {
    return {
      editingCount: editingTeeboxes.size,
      totalExisting: teeboxData.length
    };
  };

  const canEdit = () => {
    if (!user) return false;
    const userRole = user.role?.toLowerCase();
    return userRole === 'admin' || userRole === 'ambassador' || userRole === 'club pro';
  };

  const handleToggleTeeboxEdit = (teeboxName: string) => {
    const isEditing = editingTeeboxes.has(teeboxName);
    if (isEditing) {
      // Cancel editing - revert to original values
      const existing = teeboxData.find((t: TeeboxData) => t.teebox === teeboxName);
      if (existing) {
        setTeeboxInputs(prev => ({
          ...prev,
          [teeboxName]: {
            rating: existing.course_rating.toString(),
            slope: existing.course_slope.toString()
          }
        }));
      }
      setEditingTeeboxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(teeboxName);
        return newSet;
      });
    } else {
      // Enable editing
      setEditingTeeboxes(prev => {
        const newSet = new Set(prev);
        newSet.add(teeboxName);
        return newSet;
      });
    }
  };

  const handleClose = () => {
    setActiveTab('par');
    setParValues([]);
    setHoleIndexes([]);
    setTeeboxData([]);
    setTeeboxInputs({});
    setEditingTeeboxes(new Set());
    setUnavailableTeeboxes(new Set());
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Course</h2>
            <p className="text-sm text-gray-600">{course.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Loading course data...</span>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('par')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'par'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Target className="w-4 h-4 inline mr-2" />
                  Par Values
                </button>
                <button
                  onClick={() => setActiveTab('holeindex')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'holeindex'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Info className="w-4 h-4 inline mr-2" />
                  Hole Indexes
                </button>
                <button
                  onClick={() => setActiveTab('teebox')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'teebox'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit3 className="w-4 h-4 inline mr-2" />
                  Teeboxes
                </button>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                  <span className="text-red-800">{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-green-800">{success}</span>
                </div>
              )}

              {/* Par Values Tab */}
              {activeTab === 'par' && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Par Values</h3>
                    <p className="text-sm text-gray-600">
                      Set the par value for each hole. This affects handicap calculations.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-6 md:grid-cols-9 lg:grid-cols-18 gap-2 mb-6">
                    {parValues.map((par, index) => (
                      <div key={index} className="text-center">
                        <label className="block text-xs text-gray-600 mb-1">Hole {index + 1}</label>
                                                 <input
                           type="number"
                           min="3"
                           max="6"
                           value={par}
                           onChange={(e) => {
                             const newParValues = [...parValues];
                             newParValues[index] = parseInt(e.target.value) || 4;
                             setParValues(newParValues);
                           }}
                           disabled={!canEdit()}
                           className={`w-full px-2 py-1 text-center border rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                             !canEdit() ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300'
                           }`}
                         />
                      </div>
                    ))}
                  </div>
                  
                                     {canEdit() && (
                     <div className="flex justify-end">
                       <button
                         onClick={handleSaveParValues}
                         disabled={saving}
                         className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                       >
                         {saving ? (
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                         ) : (
                           <Save className="w-4 h-4 mr-2" />
                         )}
                         Save Par Values
                       </button>
                     </div>
                   )}
                </div>
              )}

              {/* Hole Indexes Tab */}
              {activeTab === 'holeindex' && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Hole Indexes</h3>
                    <p className="text-sm text-gray-600">
                      Set the handicap index for each hole. This determines which holes receive handicap strokes during match play.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-6 md:grid-cols-9 lg:grid-cols-18 gap-2 mb-6">
                    {holeIndexes.map((index, holeNumber) => (
                      <div key={holeNumber} className="text-center">
                        <label className="block text-xs text-gray-600 mb-1">Hole {holeNumber + 1}</label>
                        <input
                          type="number"
                          min="1"
                          max="18"
                          value={index}
                          onChange={(e) => {
                            const newIndexes = [...holeIndexes];
                            newIndexes[holeNumber] = parseInt(e.target.value) || 1;
                            setHoleIndexes(newIndexes);
                          }}
                          disabled={!canEdit()}
                          className={`w-full px-2 py-1 text-center border rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            !canEdit() ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {canEdit() && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveHoleIndexes}
                        disabled={saving}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Hole Indexes
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Teeboxes Tab */}
              {activeTab === 'teebox' && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Teeboxes</h3>
                    <p className="text-sm text-gray-600">
                      Set course rating and slope for each teebox. Leave fields empty for teeboxes you don't want to configure.
                    </p>
                  </div>

                  {/* Teebox Input Grid */}
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                    {TEEBOX_ORDER.map((teebox) => {
                         const existing = teeboxData.find((t: TeeboxData) => t.teebox === teebox);
                         const inputs = teeboxInputs[teebox] || { rating: '', slope: '' };
                         const hasValues = inputs.rating && inputs.slope;
                         const isUnavailable = unavailableTeeboxes.has(teebox);
                         
                         return (
                           <div
                             key={teebox}
                             className={`p-4 rounded-lg border-2 relative ${
                               isUnavailable
                                 ? 'bg-gray-100 border-gray-300 opacity-60'
                                 : existing 
                                   ? TEEBOX_COLORS[teebox] || 'bg-green-50 border-green-200'
                                   : hasValues 
                                     ? 'bg-blue-50 border-blue-200'
                                     : 'bg-gray-50 border-gray-200'
                             }`}
                           >
                             {/* Edit Icon for Existing Teeboxes */}
                             {existing && !isUnavailable && canEdit() && (
                               <button
                                 onClick={() => handleToggleTeeboxEdit(teebox)}
                                 className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                                   editingTeeboxes.has(teebox)
                                     ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                     : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                 }`}
                                 title={editingTeeboxes.has(teebox) ? 'Cancel Edit' : 'Edit Teebox'}
                               >
                                 {editingTeeboxes.has(teebox) ? (
                                   <XIcon className="w-3 h-3" />
                                 ) : (
                                   <Pencil className="w-3 h-3" />
                                 )}
                               </button>
                             )}
                             
                             {/* Toggle Unavailable Icon */}
                             {!existing && canEdit() && (
                               <button
                                 onClick={() => handleToggleUnavailable(teebox)}
                                 className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                                   isUnavailable
                                     ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                     : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                 }`}
                                 title={isUnavailable ? 'Mark as Available' : 'Mark as Not Available'}
                               >
                                 {isUnavailable ? (
                                   <XIcon className="w-3 h-3" />
                                 ) : (
                                   <XIcon className="w-3 h-3" />
                                 )}
                               </button>
                             )}
                             
                             <div className="font-medium text-center mb-3 text-gray-900">
                               {teebox}
                               {isUnavailable && (
                                 <div className="text-xs text-gray-500 mt-1">
                                   Not available
                                 </div>
                               )}
                               {!isUnavailable && existing && (
                                 <div className="text-xs text-gray-500 mt-1">
                                   Used {existing.usage_count} times
                                 </div>
                               )}
                               {!isUnavailable && !existing && hasValues && (
                                 <div className="text-xs text-blue-600 mt-1">
                                   New teebox
                                 </div>
                               )}
                               {!isUnavailable && !existing && !hasValues && (
                                 <div className="text-xs text-gray-400 mt-1">
                                   No data
                                 </div>
                               )}
                             </div>
                            
                                                         {isUnavailable ? (
                               // Display unavailable message
                               <div className="space-y-2">
                                 <div className="text-center">
                                   <div className="text-lg font-semibold text-gray-500">
                                     Not Available
                                   </div>
                                   <div className="text-xs text-gray-400">
                                     This teebox doesn't exist at this course
                                   </div>
                                 </div>
                               </div>
                             ) : existing && !editingTeeboxes.has(teebox) ? (
                               // Display current values as text for existing teeboxes
                               <div className="space-y-2">
                                 <div className="text-center">
                                   <div className="text-lg font-semibold text-gray-900">
                                     {existing.course_rating}/{existing.course_slope}
                                   </div>
                                   <div className="text-xs text-gray-500">
                                     Current Rating/Slope
                                   </div>
                                 </div>
                               </div>
                             ) : (
                               // Show input fields for new teeboxes or when editing
                               <div className="space-y-3">
                                 <div>
                                   <label className="block text-xs font-medium text-gray-700 mb-1">
                                     Course Rating
                                   </label>
                                   <input
                                     type="number"
                                     step="0.1"
                                     min="60"
                                     max="80"
                                     value={inputs.rating}
                                     onChange={(e) => handleTeeboxInputChange(teebox, 'rating', e.target.value)}
                                     placeholder="72.0"
                                     disabled={!canEdit()}
                                     className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                       !canEdit() ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300'
                                     }`}
                                   />
                                 </div>
                                 
                                 <div>
                                   <label className="block text-xs font-medium text-gray-700 mb-1">
                                     Course Slope
                                   </label>
                                   <input
                                     type="number"
                                     step="0.1"
                                     min="55"
                                     max="155"
                                     value={inputs.slope}
                                     onChange={(e) => handleTeeboxInputChange(teebox, 'slope', e.target.value)}
                                     placeholder="113"
                                     disabled={!canEdit()}
                                     className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                       !canEdit() ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300'
                                     }`}
                                   />
                                 </div>
                               </div>
                             )}
                            
                                                         {existing && editingTeeboxes.has(teebox) && inputs.rating && inputs.slope && 
                               (inputs.rating !== existing.course_rating.toString() || 
                                inputs.slope !== existing.course_slope.toString()) && (
                               <div className="mt-2 text-xs text-blue-600 text-center">
                                 → New: {inputs.rating}/{inputs.slope}
                               </div>
                             )}
                                                          {!existing && hasValues && (
                               <div className="mt-2 text-xs text-blue-600 text-center">
                                 New teebox: {inputs.rating}/{inputs.slope}
                               </div>
                             )}
                           </div>
                         );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const stats = getTeeboxStats();
                        const editingStats = getEditingStats();
                        const total = stats.existingCount + stats.newCount + stats.modifiedCount;
                        const parts = [];
                        
                        if (stats.newCount > 0) {
                          parts.push(`${stats.newCount} new`);
                        }
                        if (stats.modifiedCount > 0) {
                          parts.push(`${stats.modifiedCount} modified`);
                        }
                        if (stats.existingCount > 0) {
                          parts.push(`${stats.existingCount} unchanged`);
                        }
                        if (stats.unavailableCount > 0) {
                          parts.push(`${stats.unavailableCount} unavailable`);
                        }
                        
                        let result = `${total} of ${TEEBOX_ORDER.length} teeboxes configured (${parts.join(', ')})`;
                        
                        if (editingStats.editingCount > 0) {
                          result += ` • ${editingStats.editingCount} being edited`;
                        }
                        
                        return result;
                      })()}
                    </div>
                                         {canEdit() ? (
                       <div className="flex space-x-2">
                         <button
                           onClick={handleClearAllTeeboxes}
                           className="px-4 py-2 text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                         >
                           Clear All
                         </button>
                         <button
                           onClick={handleSaveTeeboxes}
                           disabled={saving || getConfiguredTeeboxCount() === 0}
                           className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                         >
                           {saving ? (
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                           ) : (
                             <Save className="w-4 h-4 mr-2" />
                           )}
                           Save All Teeboxes
                         </button>
                       </div>
                     ) : (
                       <div className="text-sm text-gray-500 text-center">
                         Only Club Pro, Admin, and Ambassador users can edit course data
                       </div>
                     )}
                  </div>

                  {/* Help Info */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Need help finding ratings?</p>
                        <p className="mb-2">
                          Course rating and slope values can be found on the course's official scorecard or through golf course databases.
                        </p>
                        <a
                          href="https://simulatorgolftour.com/courses"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          Visit SGT Course Database →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseEditModal; 