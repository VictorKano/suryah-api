package br.com.suryah.recurringclass;

import br.com.suryah.classtype.ClassType;
import jakarta.persistence.*;
import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Entity
@Table(
    name = "recurring_class",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_recurring_class_slot",
        columnNames = {"day_of_week", "start_time", "class_type_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurringClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false, length = 10)
    private DayOfWeek dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "duration_min", nullable = false)
    private Integer durationMin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_type_id", nullable = false)
    private ClassType classType;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
