import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Mail,
  Phone,
  Eye,
  Download,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  CheckCircle,
  Award,
  Loader2,
  AlertCircle,
  RefreshCw,
  X, // Only keep X, remove XCircle if not used elsewhere
} from "lucide-react";
import { useEmployer } from "../contexts/EmployerProvider";
import { api } from "../lib/axios";
import { getRating, submitRating, updateRating } from "../helper/Rating";
import RatingModal from "./RatingModal";
import Modal from "./Modal";

export default function ViewUsersModal({
  isOpen,
  onClose,
  jobData,
  initialJobApplicants,
  initialCurrentRating,
  onDataChange, // New callback for when data is modified
}) {
  const {
    userApplications,
    loading,
    error,
    refetch,
    getUserApplications,
    updateUserApplication,
    getUserDetails,
  } = useEmployer();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isUpdatingApplicant, setIsUpdatingApplicant] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedApplicantForRating, setSelectedApplicantForRating] =
    useState(null);
  const [currentRating, setCurrentRating] = useState(initialCurrentRating);
  const [jobApplicants, setJobApplicants] = useState(
    initialJobApplicants || []
  );
  const [hasDataChanged, setHasDataChanged] = useState(false);

  const usersPerPage = 8;

  useEffect(() => {
    if (isOpen && jobData?.id) {
      fetchApplicantsWithRatings(jobData.id);
    }
  }, [isOpen, jobData?.id]);

  const fetchApplicantsWithRatings = async (jobId) => {
    try {
      const response = await api.get(`/jobs/${jobId}`);
      const appliedUsers = response.data.applied_users || [];
      const jobDetails = response.data.data;

      const applicantsWithRatings = await Promise.all(
        appliedUsers.map(async (applicant) => {
          let rating = 0;
          if (
            jobDetails.life_cycle === "ended" &&
            applicant.application_status === "accepted"
          ) {
            try {
              const ratingResponse = await getRating(jobId, applicant.user_id);
              if (ratingResponse.success && ratingResponse.data) {
                rating = parseInt(ratingResponse.data.rating);
              }
            } catch (ratingError) {
              console.warn(
                `No rating found or error fetching rating for user ${applicant.user_id}:`,
                ratingError.message
              );
            }
          }
          return {
            ...applicant,
            job_id: jobId, // Add job_id to applicant object for handleSubmitRating
            rating: rating,
          };
        })
      );
      setJobApplicants(applicantsWithRatings);
    } catch (err) {
      console.error("Error fetching applicants for modal:", err);
      // Handle error display within the modal if needed
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "hired":
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3" />;
      case "hired":
      case "accepted":
        return <CheckCircle className="w-3 h-3" />;
      case "rejected":
        return <X className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star
          key="half"
          className="w-4 h-4 fill-yellow-400/50 text-yellow-400"
        />
      );
    }

    const remainingStars = 5 - Math.ceil(rating || 0);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  const getStatusStats = () => {
    const applicants = jobApplicants || [];
    return {
      total: applicants.length,
      pending: applicants.filter(
        (user) => user.application_status === "applied"
      ).length,
      hired: applicants.filter((user) => user.application_status === "accepted")
        .length,
      rejected: applicants.filter(
        (user) => user.application_status === "rejected"
      ).length,
    };
  };

  const handleOpenRatingModal = (applicant) => {
    setSelectedApplicantForRating(applicant);
    setCurrentRating(applicant.rating || 0);
    setShowRatingModal(true);
  };

  const handleCloseRatingModal = () => {
    setSelectedApplicantForRating(null);
    setCurrentRating(0);
    setShowRatingModal(false);
  };

  const handleSubmitRating = async (rating) => {
    if (!selectedApplicantForRating || !jobData?.id) return;

    const { user_id } = selectedApplicantForRating;
    const jobId = jobData.id;

    try {
      if (currentRating > 0) {
        await updateRating(jobId, user_id, rating);
      } else {
        await submitRating(jobId, user_id, rating);
      }
      alert("Rating submitted successfully!");
      handleCloseRatingModal();
      setHasDataChanged(true);
      fetchApplicantsWithRatings(jobId); // Refresh applicants to show new rating
    } catch (err) {
      console.error("Error submitting rating:", err);
      alert("Failed to submit rating.");
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId,
    newStatus,
    jobId
  ) => {
    if (
      window.confirm(`Are you sure you want to ${newStatus} this application?`)
    ) {
      try {
        setIsUpdatingApplicant(applicationId);
        await updateUserApplication(applicationId, { status: newStatus });
        setHasDataChanged(true);
        fetchApplicantsWithRatings(jobId); // Refresh the applicants list
      } catch (err) {
        console.error("Error updating application status:", err);
        alert("Failed to update application status");
      } finally {
        setIsUpdatingApplicant(null);
      }
    }
  };

  const stats = getStatusStats();

  const filteredUsers = jobApplicants.filter((applicant) => {
    const matchesSearch =
      applicant.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.username?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || applicant.application_status === statusFilter;

    let matchesRating = true;
    if (ratingFilter === "all") {
      matchesRating = true;
    } else if (ratingFilter === "to_be_rated") {
      matchesRating = applicant.rating === 0;
    } else if (ratingFilter === "already_rated") {
      matchesRating = applicant.rating > 0;
    } else if (ratingFilter === "4+") {
      matchesRating = (applicant.rating || 0) >= 4;
    } else if (ratingFilter === "4.5+") {
      matchesRating = (applicant.rating || 0) >= 4.5;
    }

    return matchesSearch && matchesStatus && matchesRating;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = filteredUsers.slice(
    startIndex,
    startIndex + usersPerPage
  );

  if (!isOpen) return null;

  const handleClose = () => {
    onClose(hasDataChanged);
  };

  return (
    <Modal
      isOpen={isOpen}
      onToggle={handleClose}
      title={`Applicants for ${jobData?.title || "Job"}`}
    >
      <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b border-slate-200">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Applicants
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.total}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.pending}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Hired</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.hired}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.rejected}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, username, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="applied">Pending</option>
                <option value="accepted">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white min-w-[140px]"
              >
                <option value="all">All Ratings</option>
                <option value="to_be_rated">To be Rated</option>
                <option value="already_rated">Already Rated</option>
                <option value="4+">4+ Stars</option>
                <option value="4.5+">4.5+ Stars</option>
              </select>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-auto p-6">
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Applicants Found
              </h3>
              <p className="text-slate-600">
                No applicants match your current filters.
              </p>
            </div>
          )}
          {filteredUsers.length > 0 && (
            <div className="space-y-4">
              {currentUsers.map((applicant) => (
                <div
                  key={applicant.user_id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {applicant.profile_picture ? (
                          <img
                            src={applicant.profile_picture}
                            alt={`${applicant.first_name} ${applicant.last_name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-lg"
                          style={{
                            display: applicant.profile_picture
                              ? "none"
                              : "flex",
                          }}
                        >
                          {applicant.first_name?.[0]?.toUpperCase()}
                          {applicant.last_name?.[0]?.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">
                              {applicant.first_name} {applicant.last_name}
                            </h3>
                            <p className="text-sm text-slate-600">
                              @{applicant.username}
                            </p>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 w-fit ${
                              applicant.application_status === "accepted"
                                ? "bg-green-100 text-green-700"
                                : applicant.application_status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {applicant.application_status === "accepted" ? (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            ) : applicant.application_status === "rejected" ? (
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            ) : (
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            )}
                            {applicant.application_status === "applied"
                              ? "Pending"
                              : applicant.application_status === "accepted"
                              ? "Hired"
                              : "Rejected"}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-3">
                          <span>
                            Applied: {formatDate(applicant.application_date)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span>Rating:</span>
                            <div className="flex items-center gap-1">
                              {renderStars(applicant.rating)}
                              <span>
                                ({applicant.rating?.toFixed(1) || "N/A"})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {applicant.application_status === "applied" && (
                        <>
                          <button
                            onClick={() =>
                              handleUpdateApplicationStatus(
                                applicant.application_id,
                                "accepted",
                                applicant.job_id
                              )
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={
                              isUpdatingApplicant === applicant.application_id
                            }
                          >
                            {isUpdatingApplicant ===
                            applicant.application_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateApplicationStatus(
                                applicant.application_id,
                                "rejected",
                                applicant.job_id
                              )
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={
                              isUpdatingApplicant === applicant.application_id
                            }
                          >
                            {isUpdatingApplicant ===
                            applicant.application_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                        </>
                      )}
                      {applicant.application_status === "accepted" &&
                        jobData?.life_cycle === "ended" && (
                          <button
                            onClick={() => handleOpenRatingModal(applicant)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                          >
                            <Star className="w-4 h-4" />
                            {applicant.rating > 0
                              ? "Edit Rating"
                              : "Rate Employee"}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredUsers.length > usersPerPage && (
          <div className="p-6 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <RatingModal
          isOpen={showRatingModal}
          onClose={handleCloseRatingModal}
          applicant={selectedApplicantForRating}
          currentRating={currentRating}
          onSubmitRating={handleSubmitRating}
        />
      </div>
    </Modal>
  );
}
