import RatingStars from './RatingStars';

export default function CourseCard({ course }) {
  return (
    <article className="bg-cardBg rounded-md shadow-sm overflow-hidden">
      <div className="aspect-[3/2] w-full">
        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold line-clamp-2">{course.title}</h3>
        <p className="text-sm mt-1 text-gray-600">{course.short_description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <RatingStars value={course.avg_rating} />
            <span className="text-xs">({course.review_count})</span>
          </div>
          <div className="text-sm font-medium">
            {course.is_free ? <span className="px-2 py-1 bg-green-50 rounded">Free</span> : `$${course.price}`}
          </div>
        </div>
      </div>
    </article>
  );
}
